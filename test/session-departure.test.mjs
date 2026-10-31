import { WebSocket } from 'ws';
import crypto from 'crypto';
import { spawn } from 'child_process';

const TEST_PORT = process.env.PORT || '3099';
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const WS_URL = `ws://127.0.0.1:${TEST_PORT}/ws`;

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

const CHARSET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
function generateValidSessionId() {
  const getRandomChars = (len) => {
    const array = new Uint8Array(len);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => CHARSET[byte % CHARSET.length]).join('');
  };
  return `${getRandomChars(4)}-${getRandomChars(4)}-${getRandomChars(2)}`;
}

async function hashPasscode(passcode, sessionId) {
  const enc = new TextEncoder();
  const data = enc.encode(`U2U-AUTH-V2:${sessionId.trim().toUpperCase()}:${passcode.trim()}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function createTestSession() {
  const sessionId = generateValidSessionId();
  const passcode = 'TestPass123!';
  const pcHash = await hashPasscode(passcode, sessionId);

  const res = await fetch(`${BASE_URL}/api/session/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, passcodeHash: pcHash })
  });
  const data = await res.json();
  return { sessionId, passcode, pcHash, creatorTicket: data.ticket, joinToken: data.joinToken };
}

async function getJoinerTicket(sessionId, passcode, clientId) {
  const pcHash = await hashPasscode(passcode, sessionId);
  const res = await fetch(`${BASE_URL}/api/session/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, passcodeHash: pcHash, clientId })
  });
  const data = await res.json();
  return { status: res.status, data };
}

function connectWs(sessionId, ticket, clientId) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    const messages = [];
    ws.on('open', () => {
      ws.send(JSON.stringify({
        type: 'join',
        sessionId,
        ticket,
        clientId,
        identity: { displayName: clientId, avatar: 'neon-neko' }
      }));
    });
    ws.on('message', (raw) => {
      try {
        const parsed = JSON.parse(raw.toString());
        messages.push(parsed);
      } catch {}
    });
    ws.on('error', reject);
    setTimeout(() => resolve({ ws, messages }), 300);
  });
}

async function runSessionDepartureTests() {
  console.log('====================================================');
  console.log('   U2U SESSION DEPARTURE & LIFECYCLE VERIFICATION   ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // Set test grace period to 1.5 seconds for automated timeout tests
  const TEST_GRACE_MS = 1500;
  const serverProc = spawn('node', ['server.js'], {
    env: { ...process.env, PORT: TEST_PORT, NODE_ENV: 'test', RECONNECT_GRACE_PERIOD_MS: String(TEST_GRACE_MS) }
  });

  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Server start timeout')), 10000);
      serverProc.stdout.on('data', (data) => {
        if (data.toString().includes(`running on port ${TEST_PORT}`)) {
          clearTimeout(timeout);
          resolve();
        }
      });
      serverProc.stderr.on('data', (data) => {
        console.error('Server stderr:', data.toString());
      });
    });

    // ──────────────────────────────────────────────────────────
    // TEST 1: Actual reload → immediate permanent departure
    // ──────────────────────────────────────────────────────────
    console.log('--- TEST 1: ACTUAL RELOAD -> PERMANENT DEPARTURE ---');
    const sess1 = await createTestSession();
    const clientA1 = 'client-A-reload';
    const clientB1 = 'client-B-stay';

    const connA1 = await connectWs(sess1.sessionId, sess1.creatorTicket, clientA1);
    const joinB1 = await getJoinerTicket(sess1.sessionId, sess1.passcode, clientB1);
    const connB1 = await connectWs(sess1.sessionId, joinB1.data.ticket, clientB1);

    // Browser fires beforeunload on reload: sends leave_session and closes socket with 1001 ('Going Away')
    connA1.ws.send(JSON.stringify({ type: 'leave_session', sessionId: sess1.sessionId, clientId: clientA1 }));
    connA1.ws.close(1001, 'Going Away');
    await sleep(400);

    const bReceivedPermanent1 = connB1.messages.find(m => m.type === 'peer_left_permanent');
    assert(Boolean(bReceivedPermanent1), 'Actual reload immediately triggers peer_left_permanent on peer');
    assert(bReceivedPermanent1?.text === 'User left the session', 'Event contains text: "User left the session"');
    assert(typeof bReceivedPermanent1?.timestamp === 'number', 'Event contains valid epoch timestamp');

    connB1.ws.close();

    // ──────────────────────────────────────────────────────────
    // TEST 2: Actual tab close → permanent departure
    // ──────────────────────────────────────────────────────────
    console.log('\n--- TEST 2: ACTUAL TAB CLOSE -> PERMANENT DEPARTURE ---');
    const sess2 = await createTestSession();
    const clientA2 = 'client-A-tabclose';
    const clientB2 = 'client-B-tabclose';

    const connA2 = await connectWs(sess2.sessionId, sess2.creatorTicket, clientA2);
    const joinB2 = await getJoinerTicket(sess2.sessionId, sess2.passcode, clientB2);
    const connB2 = await connectWs(sess2.sessionId, joinB2.data.ticket, clientB2);

    // Browser fires pagehide / beacon on tab close: calls POST /api/session/leave and closes socket
    const beaconRes = await fetch(`${BASE_URL}/api/session/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sess2.sessionId, clientId: clientA2 })
    });
    connA2.ws.close(1001, 'Going Away');
    await sleep(400);

    assert(beaconRes.status === 200, 'Page unload beacon POST /api/session/leave succeeds');
    const bReceivedPermanent2 = connB2.messages.find(m => m.type === 'peer_left_permanent');
    assert(Boolean(bReceivedPermanent2), 'Actual tab close immediately triggers peer_left_permanent on peer');
    assert(bReceivedPermanent2?.text === 'User left the session', 'Event text verifies "User left the session"');

    connB2.ws.close();

    // ──────────────────────────────────────────────────────────
    // TEST 3: Brief network loss → session remains recoverable (no immediate departure)
    // ──────────────────────────────────────────────────────────
    console.log('\n--- TEST 3: BRIEF NETWORK LOSS -> SESSION RECOVERABLE ---');
    const sess3 = await createTestSession();
    const clientA3 = 'client-A-network';
    const clientB3 = 'client-B-network';

    const connA3 = await connectWs(sess3.sessionId, sess3.creatorTicket, clientA3);
    const joinB3 = await getJoinerTicket(sess3.sessionId, sess3.passcode, clientB3);
    const connB3 = await connectWs(sess3.sessionId, joinB3.data.ticket, clientB3);

    const a3ReconnectTicket = connA3.messages.find(m => m.type === 'joined')?.reconnectTicket;
    assert(Boolean(a3ReconnectTicket), 'Client A received rolling reconnect ticket');

    // Simulate unexpected network loss: socket abruptly terminates (abnormal closure without leave signal)
    connA3.ws.terminate();
    await sleep(300);

    const bReceivedPermanentDuringDrop = connB3.messages.find(m => m.type === 'peer_left_permanent');
    assert(!bReceivedPermanentDuringDrop, 'Brief network loss does NOT trigger immediate permanent departure');

    const bReceivedTempDrop = connB3.messages.find(m => m.type === 'peer_left' && m.temporary === true);
    assert(Boolean(bReceivedTempDrop), 'Remaining peer receives temporary presence drop notice (temporary: true)');

    // ──────────────────────────────────────────────────────────
    // TEST 4: Reconnection within grace period → session restored, no false departure
    // ──────────────────────────────────────────────────────────
    console.log('\n--- TEST 4: RECONNECTION WITHIN GRACE PERIOD ---');
    // Client A reconnects after brief network blip using reconnect ticket
    const connA3Reconnected = await connectWs(sess3.sessionId, a3ReconnectTicket, clientA3);
    assert(connA3Reconnected.messages.some(m => m.type === 'joined'), 'Client A reconnected successfully within grace period');

    await sleep(300);

    // Verify peer received peer_joined (reconnected)
    const bReceivedRejoin = connB3.messages.find(m => m.type === 'peer_joined');
    assert(Boolean(bReceivedRejoin), 'Peer B received peer_joined event upon Client A reconnection');

    // Verify NO permanent departure notice was ever created
    const bStillNoPermanentNotice = connB3.messages.filter(m => m.type === 'peer_left_permanent');
    assert(bStillNoPermanentNotice.length === 0, 'No false "User left the session" notification was created');

    // Exchange a message to verify session is 100% operational
    const msgId = 'msg-reconnect-test-1';
    connA3Reconnected.ws.send(JSON.stringify({
      type: 'message',
      sessionId: sess3.sessionId,
      envelope: {
        id: msgId,
        type: 'text',
        iv: 'sample-iv',
        ciphertext: 'sample-ciphertext',
        timestamp: Date.now()
      }
    }));
    await sleep(300);

    const bGotMessage = connB3.messages.find(m => m.type === 'message' && m.envelope?.id === msgId);
    assert(Boolean(bGotMessage), 'Restored session transmits encrypted messages successfully');

    connA3Reconnected.ws.close(1001, 'Going Away');
    connB3.ws.close();

    // ──────────────────────────────────────────────────────────
    // TEST 5: No reconnection after grace period → permanent departure
    // ──────────────────────────────────────────────────────────
    console.log('\n--- TEST 5: NO RECONNECTION AFTER GRACE PERIOD (TIMEOUT) ---');
    const sess5 = await createTestSession();
    const clientA5 = 'client-A-timeout';
    const clientB5 = 'client-B-staying';

    const connA5 = await connectWs(sess5.sessionId, sess5.creatorTicket, clientA5);
    const joinB5 = await getJoinerTicket(sess5.sessionId, sess5.passcode, clientB5);
    const connB5 = await connectWs(sess5.sessionId, joinB5.data.ticket, clientB5);

    const a5ReconnectTicket = connA5.messages.find(m => m.type === 'joined')?.reconnectTicket;

    // Simulate Client A dropping connection and NEVER reconnecting
    connA5.ws.terminate();

    // Immediately after drop: should NOT be departed yet
    await sleep(200);
    assert(!connB5.messages.some(m => m.type === 'peer_left_permanent'), 'Immediately after drop: no permanent departure yet');

    // Wait for the grace period (1500ms) to elapse + margin
    console.log(`  (waiting ${TEST_GRACE_MS + 400}ms for grace period timeout...)`);
    await sleep(TEST_GRACE_MS + 400);

    const bReceivedPermanentAfterTimeout = connB5.messages.find(m => m.type === 'peer_left_permanent');
    assert(Boolean(bReceivedPermanentAfterTimeout), 'Permanent departure fires authoritatively after grace period timeout');
    assert(bReceivedPermanentAfterTimeout?.text === 'User left the session', 'Timeout event contains text: "User left the session"');

    // ──────────────────────────────────────────────────────────
    // TEST 6: Departed participant cannot reconnect or send messages
    // ──────────────────────────────────────────────────────────
    console.log('\n--- TEST 6: DEPARTED PARTICIPANT CANNOT RECONNECT OR SEND MESSAGES ---');
    // 6.1: Departed participant A tries to re-authenticate via HTTP
    const aReauthAttempt = await getJoinerTicket(sess5.sessionId, sess5.passcode, clientA5);
    assert(aReauthAttempt.status === 403, 'Departed participant HTTP auth is rejected with 403 Forbidden');
    assert(aReauthAttempt.data.error === 'SESSION_LEFT', 'Rejection code is SESSION_LEFT');

    // 6.2: Departed participant A tries to join via WS directly with their reconnect ticket
    const connAFailed = await connectWs(sess5.sessionId, a5ReconnectTicket, clientA5);
    const aJoinError = connAFailed.messages.find(m => m.type === 'error' && m.code === 'SESSION_LEFT');
    assert(Boolean(aJoinError), 'Departed participant WebSocket join with reconnect ticket is denied with SESSION_LEFT');
    connAFailed.ws.close();

    // 6.3: Messages in departed session are rejected
    connB5.ws.send(JSON.stringify({
      type: 'message',
      sessionId: sess5.sessionId,
      envelope: {
        id: 'msg-blocked-timeout',
        type: 'text',
        iv: 'iv-test',
        ciphertext: 'ciphertext-test',
        timestamp: Date.now()
      }
    }));
    await sleep(300);

    const bSendBlocked = connB5.messages.find(m => m.type === 'error' && m.code === 'SESSION_TERMINATED');
    assert(Boolean(bSendBlocked), 'Message in departed session is rejected by server with SESSION_TERMINATED');

    // ──────────────────────────────────────────────────────────
    // TEST 7: Remaining participant reloads after peer left → departure state restored
    // ──────────────────────────────────────────────────────────
    console.log('\n--- TEST 7: REMAINING PARTICIPANT RELOADS AFTER PEER LEFT ---');
    connB5.ws.close();
    await sleep(200);

    const bReconnectAuth = await getJoinerTicket(sess5.sessionId, sess5.passcode, clientB5);
    assert(bReconnectAuth.status === 200, 'Remaining Participant B can successfully re-authenticate after reload');
    assert(Boolean(bReconnectAuth.data.ticket), 'Server issues fresh reconnect ticket to remaining participant');

    const connB5Reloaded = await connectWs(sess5.sessionId, bReconnectAuth.data.ticket, clientB5);
    const joinedMsg = connB5Reloaded.messages.find(m => m.type === 'joined');
    assert(Boolean(joinedMsg), 'Participant B successfully re-enters session on reload');
    assert(Boolean(joinedMsg?.peerLeftStatus), 'Joined payload contains persistent peerLeftStatus');
    assert(joinedMsg?.peerLeftStatus?.text === 'User left the session', 'peerLeftStatus text is "User left the session"');

    connB5Reloaded.ws.close();

    // ──────────────────────────────────────────────────────────
    // TEST 8: Duplicate disconnect / reconnect races do not duplicate notifications
    // ──────────────────────────────────────────────────────────
    console.log('\n--- TEST 8: DEDUPLICATION OF NOTIFICATIONS ---');
    const sess8 = await createTestSession();
    const clientA8 = 'client-A-dedup';
    const clientB8 = 'client-B-dedup';

    const connA8 = await connectWs(sess8.sessionId, sess8.creatorTicket, clientA8);
    const joinB8 = await getJoinerTicket(sess8.sessionId, sess8.passcode, clientB8);
    const connB8 = await connectWs(sess8.sessionId, joinB8.data.ticket, clientB8);

    // Client A sends leave_session, calls beacon, AND closes socket with 1001 (all 3 unload triggers)
    connA8.ws.send(JSON.stringify({ type: 'leave_session', sessionId: sess8.sessionId, clientId: clientA8 }));
    await fetch(`${BASE_URL}/api/session/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sess8.sessionId, clientId: clientA8 })
    });
    connA8.ws.close(1001, 'Going Away');
    await sleep(400);

    const permanentLeftEvents = connB8.messages.filter(m => m.type === 'peer_left_permanent');
    assert(permanentLeftEvents.length === 1, `Participant B received exactly 1 departure notification (received: ${permanentLeftEvents.length})`);

    connB8.ws.close();

    // ──────────────────────────────────────────────────────────
    // TEST 9: Normal session operation remains fully functional
    // ──────────────────────────────────────────────────────────
    console.log('\n--- TEST 9: NORMAL SESSIONS OPERATE UNCHANGED ---');
    const sessNormal = await createTestSession();
    const clientNormA = 'client-normal-A';
    const clientNormB = 'client-normal-B';

    const connNormA = await connectWs(sessNormal.sessionId, sessNormal.creatorTicket, clientNormA);
    const joinNormB = await getJoinerTicket(sessNormal.sessionId, sessNormal.passcode, clientNormB);
    const connNormB = await connectWs(sessNormal.sessionId, joinNormB.data.ticket, clientNormB);

    assert(connNormA.messages.some(m => m.type === 'joined'), 'Normal Session: Client A joined');
    assert(connNormB.messages.some(m => m.type === 'joined'), 'Normal Session: Client B joined');

    const normMsgId = 'msg-norm-lifecycle';
    connNormA.ws.send(JSON.stringify({
      type: 'message',
      sessionId: sessNormal.sessionId,
      envelope: {
        id: normMsgId,
        type: 'text',
        iv: 'sample-iv',
        ciphertext: 'sample-ciphertext',
        timestamp: Date.now()
      }
    }));
    await sleep(300);

    const bReceivedMsg = connNormB.messages.find(m => m.type === 'message' && m.envelope?.id === normMsgId);
    assert(Boolean(bReceivedMsg), 'Normal Session: Client B received encrypted envelope');
    const aAck = connNormA.messages.find(m => m.type === 'message_ack' && m.id === normMsgId);
    assert(Boolean(aAck), 'Normal Session: Client A received message_ack');

    connNormA.ws.close(1001, 'Going Away');
    connNormB.ws.close(1001, 'Going Away');

  } catch (err) {
    console.error('Fatal test error:', err);
    failed++;
  } finally {
    serverProc.kill();
  }

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');
  process.exit(failed > 0 ? 1 : 0);
}

runSessionDepartureTests();
