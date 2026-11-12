import { spawn } from 'node:child_process';
import { WebSocket } from 'ws';
import crypto from 'node:crypto';

const TEST_PORT = 3105;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const WS_URL = `ws://127.0.0.1:${TEST_PORT}/ws`;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const CHARSET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
function generateSessionId() {
  const getChars = (len) => {
    const bytes = crypto.randomBytes(len);
    return Array.from(bytes, b => CHARSET[b % CHARSET.length]).join('');
  };
  return `${getChars(4)}-${getChars(4)}-${getChars(2)}`;
}

async function hashPasscode(passcode, sessionId) {
  const enc = new TextEncoder();
  const data = enc.encode(`U2U-AUTH-V2:${sessionId.trim().toUpperCase()}:${passcode.trim()}`);
  return crypto.createHash('sha256').update(data).digest('hex');
}

async function createRoom(sessionId, passcode = '1234') {
  const passcodeHash = await hashPasscode(passcode, sessionId);
  const res = await fetch(`${BASE_URL}/api/session/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, passcodeHash, durationMinutes: 30 })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Create session failed: ${JSON.stringify(data)}`);
  return data;
}

async function authRoom(sessionId, passcode = '1234', clientId = 'client-bob-2') {
  const passcodeHash = await hashPasscode(passcode, sessionId);
  const res = await fetch(`${BASE_URL}/api/session/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, passcodeHash, clientId })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Auth session failed: ${JSON.stringify(data)}`);
  return data;
}

function connectClient(sessionId, ticket, clientId) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    const messages = [];
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error(`connectClient timed out after 5s for ${clientId}`));
    }, 5000);

    ws.on('open', () => {
      ws.send(JSON.stringify({
        type: 'join',
        sessionId,
        ticket,
        clientId,
        identity: { displayName: `User-${clientId.slice(0, 4)}`, avatar: 'neon-neko' }
      }));
    });

    ws.on('message', (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        messages.push(parsed);
        if (parsed.type === 'joined') {
          clearTimeout(timeout);
          resolve({ ws, messages, ticket: parsed.reconnectTicket, joinedData: parsed });
        } else if (parsed.type === 'error') {
          clearTimeout(timeout);
          reject(new Error(`Join error for ${clientId}: ${JSON.stringify(parsed)}`));
        }
      } catch {
        // ignore parse error
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

function makeFakeEnvelope(id, senderId, type = 'text') {
  return {
    id,
    senderId,
    type,
    timestamp: Date.now(),
    iv: 'fake-iv',
    ciphertext: 'fake-ciphertext'
  };
}

async function runAntiSpamTests() {
  console.log('====================================================');
  console.log('    U2U TWO-STAGE ANTI-SPAM PROTECTION TEST SUITE   ');
  console.log('====================================================\n');

  console.log(`Starting server on test port ${TEST_PORT}...`);
  const serverProc = spawn('node', ['server.js'], {
    env: { ...process.env, PORT: String(TEST_PORT), NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  serverProc.stderr.on('data', (d) => {
    const str = d.toString();
    if (!str.includes('ExperimentalWarning')) {
      console.error('[server err]', str.trim());
    }
  });

  let serverReady = false;
  serverProc.stdout.on('data', (d) => {
    if (d.toString().includes('U2U Secure Server running')) {
      serverReady = true;
    }
  });

  for (let i = 0; i < 40; i++) {
    if (serverReady) break;
    await sleep(100);
  }

  let passed = 0;
  let failed = 0;

  function test(name, ok, detail = '') {
    if (ok) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name} ${detail}`);
      failed++;
    }
  }

  try {
    // ------------------------------------------------------------------------
    // TEST 1 & 2: 20 messages in 10s no warning; 21st message triggers warning & is delivered
    // ------------------------------------------------------------------------
    console.log('\n--- 1. STAGE ONE: 20 MESSAGES ALLOWED, 21st TRIGGERS WARNING ---');
    const roomA = generateSessionId();
    const createdA = await createRoom(roomA, '1234');
    const client1 = await connectClient(roomA, createdA.ticket, 'client-alice-1');
    const authBob = await authRoom(roomA, '1234', 'client-bob-2');
    const client2 = await connectClient(roomA, authBob.ticket, 'client-bob-2');

    await sleep(200);

    // Send 20 messages from Alice
    for (let i = 1; i <= 20; i++) {
      client1.ws.send(JSON.stringify({
        type: 'message',
        sessionId: roomA,
        envelope: makeFakeEnvelope(`msg-a-${i}`, 'client-alice-1')
      }));
    }

    await sleep(300);

    const warningsAfter20 = client1.messages.filter(m => m.type === 'spam_warning');
    const deliveredToBobAfter20 = client2.messages.filter(m => m.type === 'message' && m.envelope?.id?.startsWith('msg-a-'));
    test('1. Sending 20 messages within 10s does not trigger warning', warningsAfter20.length === 0, `Got ${warningsAfter20.length} warnings`);
    test('1b. All 20 messages are delivered to recipient', deliveredToBobAfter20.length === 20, `Delivered: ${deliveredToBobAfter20.length}`);

    // Send 21st message from Alice
    client1.ws.send(JSON.stringify({
      type: 'message',
      sessionId: roomA,
      envelope: makeFakeEnvelope('msg-a-21', 'client-alice-1')
    }));

    await sleep(300);

    const warningsAfter21 = client1.messages.filter(m => m.type === 'spam_warning');
    const bobMsg21 = client2.messages.find(m => m.type === 'message' && m.envelope?.id === 'msg-a-21');

    test('2. 21st message triggers spam warning to sender', warningsAfter21.length === 1 && warningsAfter21[0].message === "You're sending messages too quickly. Please slow down.", `Warning payload: ${JSON.stringify(warningsAfter21[0])}`);
    test('2b. 21st message is NOT blocked (delivered to recipient)', Boolean(bobMsg21), '21st message was blocked instead of delivered');

    // ------------------------------------------------------------------------
    // TEST 3, 4, 5: Continuing spam triggers 10s cooldown; both participants blocked and see countdown
    // ------------------------------------------------------------------------
    console.log('\n--- 2. STAGE TWO: CONTINUED SPAM TRIGGERS 10s COOLDOWN FOR BOTH ---');
    // Alice sends 22nd message (continuing after warning)
    client1.ws.send(JSON.stringify({
      type: 'message',
      sessionId: roomA,
      envelope: makeFakeEnvelope('msg-a-22', 'client-alice-1')
    }));

    await sleep(300);

    const aliceCooldowns = client1.messages.filter(m => m.type === 'spam_cooldown' && m.active === true);
    const bobCooldowns = client2.messages.filter(m => m.type === 'spam_cooldown' && m.active === true);
    const bobMsg22 = client2.messages.find(m => m.type === 'message' && m.envelope?.id === 'msg-a-22');

    test('3. Continued spam triggers 10s chat session cooldown', aliceCooldowns.length > 0 && aliceCooldowns[0].duration === 10, `Alice cooldowns: ${aliceCooldowns.length}`);
    test('3b. The 22nd message is blocked from reaching recipient', !bobMsg22, '22nd spam message was delivered when it should have been blocked');
    test('4. Both participants receive synchronized spam_cooldown event', Boolean(aliceCooldowns[0] && bobCooldowns[0]), 'Bob or Alice did not receive spam_cooldown');
    test('4b. Cooldown payload contains exact message "Spam detected. Messaging paused."', aliceCooldowns[0]?.message === 'Spam detected. Messaging paused.', `Got: ${aliceCooldowns[0]?.message}`);
    test('5. Cooldown payload includes remainingSeconds & expiresAt', typeof aliceCooldowns[0]?.remainingSeconds === 'number' && typeof aliceCooldowns[0]?.expiresAt === 'number', `Payload: ${JSON.stringify(aliceCooldowns[0])}`);

    // Try sending from Bob during cooldown (server-side rejection)
    const initialAliceMsgCount = client1.messages.filter(m => m.type === 'message').length;
    client2.ws.send(JSON.stringify({
      type: 'message',
      sessionId: roomA,
      envelope: makeFakeEnvelope('msg-b-during-cooldown', 'client-bob-2')
    }));

    await sleep(200);
    const newAliceMsgCount = client1.messages.filter(m => m.type === 'message').length;
    test('4c. Both participants are strictly blocked by server during cooldown', initialAliceMsgCount === newAliceMsgCount, 'Bob message got through during cooldown');

    // ------------------------------------------------------------------------
    // TEST 7: Reconnecting/refreshing does not bypass active cooldown
    // ------------------------------------------------------------------------
    console.log('\n--- 3. RECONNECT / REFRESH SYNC ---');
    // Alice disconnects and reconnects using her rolling reconnect ticket
    client1.ws.close();
    await sleep(100);

    const client1Reconnected = await connectClient(roomA, client1.ticket, 'client-alice-1');
    const joinCooldown = client1Reconnected.joinedData.spamCooldown;
    test('7. Reconnecting client receives active spamCooldown in joined payload', Boolean(joinCooldown && joinCooldown.active === true && joinCooldown.remainingSeconds > 0), `Join cooldown: ${JSON.stringify(joinCooldown)}`);

    // Verify sending via raw WebSocket directly on reconnect is also blocked by server
    client1Reconnected.ws.send(JSON.stringify({
      type: 'message',
      sessionId: roomA,
      envelope: makeFakeEnvelope('msg-raw-bypass', 'client-alice-1')
    }));

    await sleep(200);
    const bobGotRaw = client2.messages.find(m => m.type === 'message' && m.envelope?.id === 'msg-raw-bypass');
    test('7b. Raw WebSocket attempt to bypass cooldown is rejected by server', !bobGotRaw, 'Server permitted raw bypass message during cooldown');

    // ------------------------------------------------------------------------
    // TEST 9: Cooldown isolation - Room A cooldown does not affect Room B
    // ------------------------------------------------------------------------
    console.log('\n--- 4. MULTI-ROOM ISOLATION ---');
    const roomB = generateSessionId();
    const createdB = await createRoom(roomB, '1234');
    const clientB1 = await connectClient(roomB, createdB.ticket, 'client-b1');
    const authB2 = await authRoom(roomB, '1234', 'client-b2');
    const clientB2 = await connectClient(roomB, authB2.ticket, 'client-b2');

    await sleep(200);

    clientB1.ws.send(JSON.stringify({
      type: 'message',
      sessionId: roomB,
      envelope: makeFakeEnvelope('msg-roomB-1', 'client-b1')
    }));

    await sleep(200);
    const b2Msg = clientB2.messages.find(m => m.type === 'message' && m.envelope?.id === 'msg-roomB-1');
    test('9. Room A cooldown does not affect Room B (independent sessions)', Boolean(b2Msg), 'Room B message was blocked by Room A cooldown');

    // ------------------------------------------------------------------------
    // TEST 6 & 8: Messaging automatically resumes after 10s cooldown expires
    // ------------------------------------------------------------------------
    console.log('\n--- 5. AUTOMATIC RESUMPTION AFTER 10s COOLDOWN ---');
    console.log('Waiting for 10-second cooldown timer to complete...');
    await sleep(10300);

    const expiredEventAlice = client1Reconnected.messages.find(m => m.type === 'spam_cooldown' && m.active === false);
    const expiredEventBob = client2.messages.find(m => m.type === 'spam_cooldown' && m.active === false);
    test('6. Cooldown expiration broadcast (active: false) delivered to both participants', Boolean(expiredEventAlice && expiredEventBob), `Alice got: ${Boolean(expiredEventAlice)}, Bob got: ${Boolean(expiredEventBob)}`);

    // Normal messaging works immediately after recovery
    client1Reconnected.ws.send(JSON.stringify({
      type: 'message',
      sessionId: roomA,
      envelope: makeFakeEnvelope('msg-a-recovered-1', 'client-alice-1')
    }));

    await sleep(200);
    const bobRecoveredMsg = client2.messages.find(m => m.type === 'message' && m.envelope?.id === 'msg-a-recovered-1');
    test('8. Normal messaging works immediately after cooldown recovery', Boolean(bobRecoveredMsg), 'Post-cooldown message failed to deliver');

    // ------------------------------------------------------------------------
    // TEST 10: Existing text, seen receipts, photo & voice message flow remain intact
    // ------------------------------------------------------------------------
    console.log('\n--- 6. REGRESSION: EXISTING MESSAGING CAPABILITIES ---');
    client2.ws.send(JSON.stringify({
      type: 'seen',
      sessionId: roomA,
      messageId: 'msg-a-recovered-1',
      senderId: 'client-bob-2',
      seenAt: Date.now()
    }));

    client1Reconnected.ws.send(JSON.stringify({
      type: 'message',
      sessionId: roomA,
      envelope: makeFakeEnvelope('photo-msg-1', 'client-alice-1', 'photo')
    }));

    client2.ws.send(JSON.stringify({
      type: 'message',
      sessionId: roomA,
      envelope: makeFakeEnvelope('voice-msg-1', 'client-bob-2', 'voice')
    }));

    await sleep(300);

    const aliceSeenEvent = client1Reconnected.messages.find(m => m.type === 'seen' && m.messageId === 'msg-a-recovered-1');
    const bobPhoto = client2.messages.find(m => m.type === 'message' && m.envelope?.id === 'photo-msg-1');
    const aliceVoice = client1Reconnected.messages.find(m => m.type === 'message' && m.envelope?.id === 'voice-msg-1');

    test('10a. Read receipts (type: seen) function normally', Boolean(aliceSeenEvent), 'Seen event not received');
    test('10b. Photo envelopes function normally', Boolean(bobPhoto), 'Photo envelope not received');
    test('10c. Voice note envelopes function normally', Boolean(aliceVoice), 'Voice envelope not received');

    // Close sockets
    client1Reconnected.ws.close();
    client2.ws.close();
    clientB1.ws.close();
    clientB2.ws.close();

  } finally {
    serverProc.kill();
  }

  console.log('\n====================================================');
  console.log(`ANTI-SPAM SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAntiSpamTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
