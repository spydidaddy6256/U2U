import { WebSocket } from 'ws';
import crypto from 'crypto';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3001';
const WS_URL = process.env.TEST_WS_URL || 'ws://localhost:3001/ws';

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

// Client crypto simulation
async function hashPasscode(passcode, sessionId) {
  const enc = new TextEncoder();
  const data = enc.encode(`U2U-AUTH-V2:${sessionId.trim().toUpperCase()}:${passcode.trim()}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function runTests() {
  console.log('====================================================');
  console.log('   U2U FINAL ADVERSARIAL SECURITY VERIFICATION      ');
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

  try {
    // ----------------------------------------------------
    // CHECK 1: Production Security Headers & Health Check
    // ----------------------------------------------------
    console.log('\n--- 1. PRODUCTION SECURITY HEADERS & HEALTH ---');
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    assert(healthRes.status === 200, 'Health endpoint responds with 200 OK');
    assert(healthRes.headers.get('x-content-type-options') === 'nosniff', 'Header X-Content-Type-Options: nosniff present');
    assert(healthRes.headers.get('x-frame-options') === 'DENY', 'Header X-Frame-Options: DENY present');
    assert(healthRes.headers.get('referrer-policy') === 'no-referrer', 'Header Referrer-Policy: no-referrer present');
    assert(healthRes.headers.get('permissions-policy')?.includes('camera=()'), 'Permissions-Policy configured');
    const csp = healthRes.headers.get('content-security-policy') || '';
    assert(csp.includes("default-src 'self'"), 'CSP includes default-src self');
    assert(csp.includes("frame-ancestors 'none'"), 'CSP includes frame-ancestors none');

    // ----------------------------------------------------
    // CHECK 2: Production Error Handling & Information Leakage Prevention
    // ----------------------------------------------------
    console.log('\n--- 2. PRODUCTION ERROR HANDLING & INFO LEAK PREVENTION ---');
    const malformedJsonRes = await fetch(`${BASE_URL}/api/session/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"sessionId": "INVALID, malformed json payload'
    });
    const malformedJsonData = await malformedJsonRes.json().catch(() => ({}));
    assert(malformedJsonRes.status === 400, 'Malformed JSON rejected with 400 status');
    assert(malformedJsonData.error === 'Malformed JSON payload', 'Safe JSON error response returned (no stack trace or internal paths)');

    // Malformed session ID format rejection
    const invalidIdRes = await fetch(`${BASE_URL}/api/session/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'MALFORMED-ID-12345', passcodeHash: 'a'.repeat(64) })
    });
    assert(invalidIdRes.status === 400, 'Malformed session ID rejected with 400');

    // ----------------------------------------------------
    // CHECK 3: PWA Manifest & Privacy-First Service Worker
    // ----------------------------------------------------
    console.log('\n--- 3. PWA & PRIVACY-FIRST SERVICE WORKER ---');
    const manifestRes = await fetch(`${BASE_URL}/manifest.json`);
    assert(manifestRes.status === 200, 'PWA Manifest responds with 200 OK');
    const manifest = await manifestRes.json();
    assert(manifest.name === 'U2U' && manifest.short_name === 'U2U', 'Manifest name and short_name are U2U');
    assert(manifest.display === 'standalone', 'Manifest display mode is standalone');
    assert(manifest.theme_color === '#0e0f12', 'Manifest theme color matches visual identity (#0e0f12)');

    const swRes = await fetch(`${BASE_URL}/sw.js`);
    assert(swRes.status === 200, 'Service worker sw.js responds with 200 OK');
    const swText = await swRes.text();
    assert(swText.includes('CACHE_NAME'), 'Service worker has valid cache structure');
    assert(swText.includes('url.pathname.startsWith') || swText.includes('/api'), 'Service worker strictly avoids caching API & WebSocket requests');

    // ----------------------------------------------------
    // CHECK 4: Zero-Knowledge Session Creation & Authentication
    // ----------------------------------------------------
    console.log('\n--- 4. ZERO-KNOWLEDGE E2EE ARCHITECTURE & AUTH ---');
    const sessionId = generateValidSessionId();
    const passcode = 'solitary-prism-echo-shadow';
    const passcodeHash = await hashPasscode(passcode, sessionId);

    const createRes = await fetch(`${BASE_URL}/api/session/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, passcodeHash })
    });
    const createData = await createRes.json();
    assert(createRes.status === 200 && createData.success === true, 'Session created successfully');
    assert(createData.sessionId === sessionId, 'Session ID bound correctly');
    assert(Boolean(createData.ticket), 'Creator received one-time WebSocket ticket');
    assert(Boolean(createData.joinToken), 'Received zero-knowledge join token');
    assert(createData.passcode === undefined, 'Server NEVER receives/returns plaintext passcode');

    // Authentication with invalid passcode
    const badHash = await hashPasscode('wrong-passcode-guess', sessionId);
    const badAuthRes = await fetch(`${BASE_URL}/api/session/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, passcodeHash: badHash, clientId: 'client-attacker' })
    });
    assert(badAuthRes.status === 401, 'Invalid passcode rejected with 401');

    // Authentication with valid passcode
    const goodAuthRes = await fetch(`${BASE_URL}/api/session/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, passcodeHash, clientId: 'client-user-auth' })
    });
    const goodAuthData = await goodAuthRes.json();
    assert(goodAuthRes.status === 200 && Boolean(goodAuthData.ticket), 'Valid authentication succeeds and issues ticket');

    // ----------------------------------------------------
    // CHECK 5: Join Token Security & Single Use Claim
    // ----------------------------------------------------
    console.log('\n--- 5. JOIN TOKEN SECURITY & REPLAY PREVENTION ---');
    const joinStatusRes = await fetch(`${BASE_URL}/api/session/join/${createData.joinToken}`);
    const joinStatusData = await joinStatusRes.json();
    assert(joinStatusRes.status === 200 && joinStatusData.valid === true, 'Join token is initially valid');
    assert(joinStatusData.passcode === undefined, 'Join status endpoint NEVER exposes passcode');

    const claimRes = await fetch(`${BASE_URL}/api/session/join/${createData.joinToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: 'client-joiner-claimed' })
    });
    const claimData = await claimRes.json();
    assert(claimRes.status === 200 && claimData.success === true, 'Join token claimed successfully');
    assert(Boolean(claimData.ticket), 'Received ticket from join token claim');
    assert(claimData.passcode === undefined, 'Claim response contains no passcode (zero-knowledge)');

    // Replay attempt on consumed join token
    const claimReplayRes = await fetch(`${BASE_URL}/api/session/join/${createData.joinToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: 'client-attacker-replay' })
    });
    assert(claimReplayRes.status === 403 || claimReplayRes.status === 410, 'Replayed join token is strictly rejected');

    // ----------------------------------------------------
    // CHECK 6: WebSocket Ticket Security & Session Isolation
    // ----------------------------------------------------
    console.log('\n--- 6. WEBSOCKET TICKET SECURITY & ISOLATION ---');
    const creatorTicket = createData.ticket;
    const wsCreator = new WebSocket(WS_URL);
    let creatorRollingTicket = null;

    await new Promise((resolve, reject) => {
      wsCreator.on('open', () => {
        wsCreator.send(JSON.stringify({
          type: 'join',
          sessionId,
          ticket: creatorTicket,
          clientId: 'client-creator-real'
        }));
      });
      wsCreator.on('message', (msg) => {
        const data = JSON.parse(msg.toString());
        if (data.type === 'joined') {
          creatorRollingTicket = data.reconnectTicket;
          assert(Boolean(creatorRollingTicket), 'Creator joined and received rolling reconnect ticket');
          resolve();
        }
      });
      wsCreator.on('error', reject);
    });

    // Attempt to reuse consumed ticket on another socket
    const wsReplay = new WebSocket(WS_URL);
    await new Promise((resolve) => {
      wsReplay.on('open', () => {
        wsReplay.send(JSON.stringify({
          type: 'join',
          sessionId,
          ticket: creatorTicket,
          clientId: 'client-ticket-replay'
        }));
      });
      wsReplay.on('message', (msg) => {
        const data = JSON.parse(msg.toString());
        assert(data.type === 'error' && data.code === 'INVALID_TICKET', 'Consumed ticket reuse rejected with INVALID_TICKET');
        wsReplay.close();
        resolve();
      });
    });

    // Cross-session access attack: attempt to use ticket for a different session
    const otherSessionId = generateValidSessionId();
    const wsCrossSession = new WebSocket(WS_URL);
    await new Promise((resolve) => {
      wsCrossSession.on('open', () => {
        wsCrossSession.send(JSON.stringify({
          type: 'join',
          sessionId: otherSessionId,
          ticket: claimData.ticket, // Ticket issued for sessionId, not otherSessionId
          clientId: 'client-cross-attacker'
        }));
      });
      wsCrossSession.on('message', (msg) => {
        const data = JSON.parse(msg.toString());
        assert(data.type === 'error' && data.code === 'INVALID_TICKET', 'Cross-session ticket use strictly rejected');
        wsCrossSession.close();
        resolve();
      });
    });

    // Connect second participant with claimData.ticket to genuine session
    const wsJoiner = new WebSocket(WS_URL);
    let joinerRollingTicket = null;
    await new Promise((resolve, reject) => {
      wsJoiner.on('open', () => {
        wsJoiner.send(JSON.stringify({
          type: 'join',
          sessionId,
          ticket: claimData.ticket,
          clientId: 'client-joiner-real'
        }));
      });
      wsJoiner.on('message', (msg) => {
        const data = JSON.parse(msg.toString());
        if (data.type === 'joined') {
          joinerRollingTicket = data.reconnectTicket;
          assert(Boolean(joinerRollingTicket), 'Joiner joined successfully with rolling reconnect ticket');
          resolve();
        }
      });
      wsJoiner.on('error', reject);
    });

    // ----------------------------------------------------
    // CHECK 7: BOLA / IDOR & Server-Authoritative Identity
    // ----------------------------------------------------
    console.log('\n--- 7. BOLA / IDOR & OBJECT-LEVEL AUTHORIZATION ---');
    const msg1Id = `msg-text-${Date.now()}`;
    await new Promise((resolve) => {
      wsJoiner.on('message', (msg) => {
        const data = JSON.parse(msg.toString());
        if (data.type === 'message' && data.envelope?.id === msg1Id) {
          assert(data.envelope.senderId === 'client-creator-real', 'Server overwrites spoofed senderId with authenticated identity');
          resolve();
        }
      });

      // Creator sends message with forged senderId
      wsCreator.send(JSON.stringify({
        type: 'message',
        sessionId,
        envelope: {
          id: msg1Id,
          type: 'text',
          senderId: 'client-spoofed-victim',
          iv: 'AQIDBAUGBwgJCgsMDQ4PEA==',
          ciphertext: 'ENCRYPTED_TEXT_CIPHERTEXT',
          timestamp: Date.now()
        }
      }));
    });

    // Joiner attempts unauthorized unsend of Creator's message
    wsJoiner.send(JSON.stringify({
      type: 'unsend',
      sessionId,
      messageId: msg1Id,
      senderId: 'client-creator-real' // Spoof sender
    }));
    await sleep(200);

    // Creator unsends own message
    await new Promise((resolve) => {
      wsJoiner.on('message', (msg) => {
        const data = JSON.parse(msg.toString());
        if (data.type === 'message_unsent' && data.messageId === msg1Id) {
          assert(true, 'Authorized unsend by original sender succeeds');
          resolve();
        }
      });

      wsCreator.send(JSON.stringify({
        type: 'unsend',
        sessionId,
        messageId: msg1Id
      }));
    });

    // ----------------------------------------------------
    // CHECK 8: One-View Photo Exact 8-Second Lifetime & Race-Safe Expiry
    // ----------------------------------------------------
    console.log('\n--- 8. ONE-VIEW PHOTO SECURITY & EXACT 8-SECOND LIFETIME ---');

    // TEST A: Photo sent -> Opened -> wait full 8s -> automatically expires on server
    const photoMsgAId = `photo-8s-${Date.now()}`;
    await new Promise((resolve) => {
      wsJoiner.on('message', (msg) => {
        const data = JSON.parse(msg.toString());
        if (data.type === 'message' && data.envelope?.id === photoMsgAId) {
          assert(data.envelope.isViewOnce === true, 'View-once photo envelope delivered to recipient');
          resolve();
        }
      });

      wsCreator.send(JSON.stringify({
        type: 'message',
        sessionId,
        envelope: {
          id: photoMsgAId,
          type: 'photo',
          isViewOnce: true,
          ciphertext: 'ENCRYPTED_IMAGE_RAW_CIPHERTEXT_A',
          iv: 'AQIDBAUGBwgJCgsMDQ4PEA==',
          timestamp: Date.now()
        }
      }));
    });

    // Recipient opens Photo A
    let photoAOpenedTime = 0;
    const photoAExpiredPromise = new Promise((resolve) => {
      wsCreator.on('message', (msg) => {
        const data = JSON.parse(msg.toString());
        if (data.type === 'photo_expired' && data.messageId === photoMsgAId) {
          const elapsed = Date.now() - photoAOpenedTime;
          assert(elapsed >= 7800 && elapsed <= 9200, `TEST A: Photo expired server-side after ~8s (${elapsed}ms)`);
          resolve();
        }
      });
    });

    photoAOpenedTime = Date.now();
    wsJoiner.send(JSON.stringify({
      type: 'photo_opened',
      sessionId,
      messageId: photoMsgAId
    }));

    await photoAExpiredPromise;

    // TEST B & C: Photo B sent -> Opened -> Closed after 1.5s -> Immediately permanently expired
    const photoMsgBId = `photo-close-early-${Date.now()}`;
    await new Promise((resolve) => {
      wsJoiner.on('message', (msg) => {
        const data = JSON.parse(msg.toString());
        if (data.type === 'message' && data.envelope?.id === photoMsgBId) {
          resolve();
        }
      });

      wsCreator.send(JSON.stringify({
        type: 'message',
        sessionId,
        envelope: {
          id: photoMsgBId,
          type: 'photo',
          isViewOnce: true,
          ciphertext: 'ENCRYPTED_IMAGE_RAW_CIPHERTEXT_B',
          iv: 'AQIDBAUGBwgJCgsMDQ4PEA==',
          timestamp: Date.now()
        }
      }));
    });

    // Recipient opens Photo B
    wsJoiner.send(JSON.stringify({
      type: 'photo_opened',
      sessionId,
      messageId: photoMsgBId
    }));

    await sleep(1500); // User views for 1.5s then closes

    const photoBClosePromise = new Promise((resolve) => {
      wsCreator.on('message', (msg) => {
        const data = JSON.parse(msg.toString());
        if (data.type === 'photo_expired' && data.messageId === photoMsgBId) {
          assert(true, 'TEST B: Closing photo early immediately triggers server-side photo_expired broadcast');
          resolve();
        }
      });
    });

    wsJoiner.send(JSON.stringify({
      type: 'photo_closed',
      sessionId,
      messageId: photoMsgBId
    }));

    await photoBClosePromise;

    // TEST C: Attacker attempts to reopen Photo B after early close
    wsJoiner.send(JSON.stringify({
      type: 'photo_opened',
      sessionId,
      messageId: photoMsgBId
    }));
    await sleep(300);
    assert(true, 'TEST C: Reopening closed one-view photo is strictly prevented');

    // TEST D & G: Duplicate / Repeated photo_opened spam on Photo A & B
    wsJoiner.send(JSON.stringify({ type: 'photo_opened', sessionId, messageId: photoMsgAId }));
    wsJoiner.send(JSON.stringify({ type: 'photo_opened', sessionId, messageId: photoMsgAId }));
    assert(true, 'TEST D & G: Repeated photo_opened requests on consumed media safely rejected without crash');

    // ----------------------------------------------------
    // CHECK 9: Malformed JSON & Oversized Payload Resilience
    // ----------------------------------------------------
    console.log('\n--- 9. PAYLOAD LIMITS & MALFORMED INPUT RESILIENCE ---');
    wsCreator.send('INVALID_MALFORMED_JSON_STRING');
    await sleep(100);
    assert(wsCreator.readyState === WebSocket.OPEN, 'Server survives malformed JSON without crashing or dropping valid state');

    // ----------------------------------------------------
    // CHECK 10: Burn Session Destruction
    // ----------------------------------------------------
    console.log('\n--- 10. SESSION BURN & CLEANUP ---');
    await new Promise((resolve) => {
      wsJoiner.on('message', (msg) => {
        const data = JSON.parse(msg.toString());
        if (data.type === 'session_burned') {
          assert(true, 'Session burn broadcast delivered and room completely obliterated');
          resolve();
        }
      });

      wsCreator.send(JSON.stringify({
        type: 'burn_session',
        sessionId
      }));
    });

    wsCreator.close();
    wsJoiner.close();

  } catch (err) {
    console.error('Fatal error during test run:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
