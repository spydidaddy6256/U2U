import { spawn } from 'node:child_process';
import { WebSocket } from 'ws';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const TEST_PORT = 3108;
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

async function authRoom(sessionId, passcode = '1234', clientId = 'client-bob') {
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

function connectClient(sessionId, ticket, clientId, { platform = 'web', origin = 'https://u2u.onrender.com', userAgent = '' } = {}) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (origin) headers.origin = origin;
    if (userAgent) headers['user-agent'] = userAgent;

    const ws = new WebSocket(WS_URL, { headers });
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
        clientPlatform: platform === 'android-native' ? 'android-native' : 'web'
      }));
    });

    ws.on('message', (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        messages.push(data);
        if (data.type === 'joined') {
          clearTimeout(timeout);
          resolve({
            ws,
            messages,
            joinedPayload: data,
            waitForEvent: (predicate, waitMs = 4000) => {
              return new Promise((resWait, rejWait) => {
                const existing = messages.find(predicate);
                if (existing) return resWait(existing);
                const timer = setTimeout(() => {
                  rejWait(new Error(`waitForEvent timed out after ${waitMs}ms`));
                }, waitMs);
                const onMsg = (rawMsg) => {
                  try {
                    const parsed = JSON.parse(rawMsg.toString());
                    if (predicate(parsed)) {
                      clearTimeout(timer);
                      ws.off('message', onMsg);
                      resWait(parsed);
                    }
                  } catch {}
                };
                ws.on('message', onMsg);
              });
            }
          });
        }
      } catch (err) {
        console.error('Error in onmessage:', err);
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

async function runOneViewSuite() {
  console.log('================================================================');
  console.log('   U2U ONE-VIEW PHOTOS ANDROID-APP-ONLY VERIFICATION SUITE       ');
  console.log('================================================================\n');

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

  // Start dedicated server process
  console.log(`Starting server on test port ${TEST_PORT}...`);
  const serverProc = spawn('node', ['server.js'], {
    env: { ...process.env, PORT: String(TEST_PORT), NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const serverReady = await new Promise((res, rej) => {
    const timer = setTimeout(() => rej(new Error('Server spawn timed out after 7s')), 7000);
    serverProc.stdout.on('data', (d) => {
      if (d.toString().includes(`running on port ${TEST_PORT}`)) {
        clearTimeout(timer);
        res(true);
      }
    });
    serverProc.stderr.on('data', (d) => {
      const errStr = d.toString();
      if (!errStr.includes('ExperimentalWarning')) {
        console.error('Server stderr:', errStr);
      }
    });
  });

  if (!serverReady) {
    throw new Error('Failed to start server');
  }
  console.log('Server is online and ready.\n');

  const EXPECTED_GUIDANCE = 'One-View Photos are available exclusively in the U2U Android app. Please use the app to send and view One-View Photos.';

  try {
    // -----------------------------------------------------------------
    // SECTION 1: WEBSITE DESKTOP & MOBILE RESTRICTIONS
    // -----------------------------------------------------------------
    console.log('--- 1. WEBSITE RESTRICTIONS (DESKTOP & MOBILE BROWSERS) ---');

    // Test 1: Desktop website cannot send One-View Photos
    const sId1 = generateSessionId();
    const create1 = await createRoom(sId1);
    const auth1 = await authRoom(sId1, '1234', 'desktop-peer');

    const clientDesktopSender = await connectClient(sId1, create1.ticket, 'desktop-sender', {
      platform: 'web',
      origin: 'https://u2u.onrender.com'
    });
    const clientDesktopPeer = await connectClient(sId1, auth1.ticket, 'desktop-peer', {
      platform: 'web',
      origin: 'https://u2u.onrender.com'
    });

    const errorPromiseDesktop = clientDesktopSender.waitForEvent(e => e.type === 'error' && e.code === 'ONE_VIEW_RESTRICTED');

    clientDesktopSender.ws.send(JSON.stringify({
      type: 'message',
      sessionId: sId1,
      envelope: {
        id: 'photo-desktop-blocked-1',
        type: 'photo',
        isViewOnce: true,
        ciphertext: 'CIPHERTEXT_BLOCKED_DESKTOP',
        iv: 'AQIDBAUGBwgJCgsMDQ4PEA==',
        timestamp: Date.now()
      }
    }));

    const desktopError = await errorPromiseDesktop;
    assert(desktopError.code === 'ONE_VIEW_RESTRICTED', '1. Desktop website sending One-View Photo is rejected by server with ONE_VIEW_RESTRICTED');
    assert(desktopError.message === EXPECTED_GUIDANCE, '1b. Error contains exact required user guidance message');

    // Confirm peer never received the blocked One-View photo
    await sleep(200);
    const peerReceivedBlocked = clientDesktopPeer.messages.some(m => m.envelope?.id === 'photo-desktop-blocked-1');
    assert(!peerReceivedBlocked, '1c. Blocked One-View photo is NOT delivered to peer');

    // Test 1d: Spoofed clientPlatform: 'android-native' from web origin is rejected
    const sIdSpoof = generateSessionId();
    const createSpoof = await createRoom(sIdSpoof);
    const spoofedWebSender = await connectClient(sIdSpoof, createSpoof.ticket, 'spoofed-web-sender', {
      platform: 'android-native', // Attacker claims native platform
      origin: 'https://u2u.onrender.com' // But browser immutable Origin reveals website
    });
    const errorPromiseSpoof = spoofedWebSender.waitForEvent(e => e.type === 'error' && e.code === 'ONE_VIEW_RESTRICTED');
    spoofedWebSender.ws.send(JSON.stringify({
      type: 'message',
      sessionId: sIdSpoof,
      envelope: {
        id: 'photo-spoofed-web-1',
        type: 'photo',
        isViewOnce: true,
        ciphertext: 'CIPHERTEXT_SPOOFED_WEB',
        iv: 'AQIDBAUGBwgJCgsMDQ4PEA==',
        timestamp: Date.now()
      }
    }));
    const spoofError = await errorPromiseSpoof;
    assert(spoofError.code === 'ONE_VIEW_RESTRICTED', '1d. Spoofed clientPlatform from website origin is authoritatively rejected');
    spoofedWebSender.ws.close();

    // Test 2: Mobile website cannot send One-View Photos
    const sId2 = generateSessionId();
    const create2 = await createRoom(sId2);
    const auth2 = await authRoom(sId2, '1234', 'mobile-peer');

    const clientMobileSender = await connectClient(sId2, create2.ticket, 'mobile-sender', {
      platform: 'web',
      origin: 'https://u2u.onrender.com',
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36'
    });
    const clientMobilePeer = await connectClient(sId2, auth2.ticket, 'mobile-peer', {
      platform: 'web',
      origin: 'https://u2u.onrender.com'
    });

    const errorPromiseMobile = clientMobileSender.waitForEvent(e => e.type === 'error' && e.code === 'ONE_VIEW_RESTRICTED');

    clientMobileSender.ws.send(JSON.stringify({
      type: 'message',
      sessionId: sId2,
      envelope: {
        id: 'photo-mobile-blocked-1',
        type: 'photo',
        isViewOnce: true,
        ciphertext: 'CIPHERTEXT_BLOCKED_MOBILE',
        iv: 'AQIDBAUGBwgJCgsMDQ4PEA==',
        timestamp: Date.now()
      }
    }));

    const mobileError = await errorPromiseMobile;
    assert(mobileError.code === 'ONE_VIEW_RESTRICTED', '2. Mobile website sending One-View Photo is rejected by server');
    assert(mobileError.message === EXPECTED_GUIDANCE, '2b. Mobile website receives exact guidance message');

    clientDesktopSender.ws.close();
    clientDesktopPeer.ws.close();
    clientMobileSender.ws.close();
    clientMobilePeer.ws.close();

    // -----------------------------------------------------------------
    // SECTION 2: WEBSITE RECIPIENT PAYLOAD SANITIZATION & REDACTION
    // -----------------------------------------------------------------
    console.log('\n--- 2. WEBSITE RECIPIENT PAYLOAD PROTECTION & REDACTION ---');

    // Test 3: Native Android sends One-View photo to Desktop Web peer
    const sId3 = generateSessionId();
    const create3 = await createRoom(sId3);
    const auth3 = await authRoom(sId3, '1234', 'web-recipient');

    const nativeSender = await connectClient(sId3, create3.ticket, 'native-sender', {
      platform: 'android-native',
      origin: 'https://localhost'
    });
    const webRecipient = await connectClient(sId3, auth3.ticket, 'web-recipient', {
      platform: 'web',
      origin: 'https://u2u.onrender.com'
    });

    const webRecvPromise = webRecipient.waitForEvent(e => e.type === 'message' && e.envelope?.id === 'photo-ov-sanitized-1');

    nativeSender.ws.send(JSON.stringify({
      type: 'message',
      sessionId: sId3,
      envelope: {
        id: 'photo-ov-sanitized-1',
        type: 'photo',
        isViewOnce: true,
        ciphertext: 'SECRET_CIPHERTEXT_NEVER_REACHES_WEB',
        iv: 'AQIDBAUGBwgJCgsMDQ4PEA==',
        timestamp: Date.now()
      }
    }));

    const webRecvMsg = await webRecvPromise;
    assert(webRecvMsg.envelope.isViewOnce === true, '3a. Web recipient receives One-View notification envelope');
    assert(webRecvMsg.envelope.ciphertext === null, '3b. One-View ciphertext is strictly nullified for website recipient (never exposed)');
    assert(webRecvMsg.envelope.iv === null, '3c. One-View IV is strictly nullified for website recipient');
    assert(webRecvMsg.envelope.isRestrictedWeb === true, '3d. Envelope is marked with isRestrictedWeb: true');

    // Test 4: Website user attempts to send photo_opened or photo_closed
    const webOpenErrorPromise = webRecipient.waitForEvent(e => e.type === 'error' && e.code === 'ONE_VIEW_RESTRICTED');
    webRecipient.ws.send(JSON.stringify({
      type: 'photo_opened',
      sessionId: sId3,
      messageId: 'photo-ov-sanitized-1'
    }));

    const openError = await webOpenErrorPromise;
    assert(openError.code === 'ONE_VIEW_RESTRICTED', '4a. Website user attempting photo_opened is authoritatively rejected');
    assert(openError.message === EXPECTED_GUIDANCE, '4b. Rejection message guides user to Android app');

    // Test 5: Reconnect / refresh does NOT bypass restriction
    const reconnectTicket = webRecipient.joinedPayload.reconnectTicket;
    webRecipient.ws.close();

    const webReconnected = await connectClient(sId3, reconnectTicket, 'web-recipient', {
      platform: 'web',
      origin: 'https://u2u.onrender.com'
    });

    const recentEnvs = webReconnected.joinedPayload.recentEnvelopes || [];
    const reconnectedOneView = recentEnvs.find(e => e.id === 'photo-ov-sanitized-1');
    assert(Boolean(reconnectedOneView), '5a. Reconnected client receives recent envelopes list');
    assert(reconnectedOneView.ciphertext === null, '5b. Reconnecting web client still receives ciphertext: null for One-View photos');
    assert(reconnectedOneView.iv === null, '5c. Reconnecting web client still receives iv: null for One-View photos');

    nativeSender.ws.close();
    webReconnected.ws.close();

    // -----------------------------------------------------------------
    // SECTION 3: NATIVE ANDROID FULL FUNCTIONALITY PRESERVED
    // -----------------------------------------------------------------
    console.log('\n--- 3. NATIVE ANDROID ONE-VIEW FULL FUNCTIONALITY ---');

    // Test 6: Android App to Android App One-View photo
    const sId4 = generateSessionId();
    const create4 = await createRoom(sId4);
    const auth4 = await authRoom(sId4, '1234', 'android-peer-2');

    const androidSender = await connectClient(sId4, create4.ticket, 'android-peer-1', {
      platform: 'android-native',
      origin: 'https://localhost'
    });
    const androidReceiver = await connectClient(sId4, auth4.ticket, 'android-peer-2', {
      platform: 'android-native',
      origin: 'https://localhost'
    });

    const androidRecvPromise = androidReceiver.waitForEvent(e => e.type === 'message' && e.envelope?.id === 'photo-native-ov-1');
    const senderAckPromise = androidSender.waitForEvent(e => e.type === 'message_ack' && e.id === 'photo-native-ov-1');

    androidSender.ws.send(JSON.stringify({
      type: 'message',
      sessionId: sId4,
      envelope: {
        id: 'photo-native-ov-1',
        type: 'photo',
        isViewOnce: true,
        ciphertext: 'LEGIT_CIPHERTEXT_FOR_ANDROID',
        iv: 'AQIDBAUGBwgJCgsMDQ4PEA==',
        timestamp: Date.now()
      }
    }));

    const [androidRecvMsg, senderAck] = await Promise.all([androidRecvPromise, senderAckPromise]);
    assert(Boolean(senderAck), '6a. Android sender receives message_ack for One-View photo');
    assert(androidRecvMsg.envelope.ciphertext === 'LEGIT_CIPHERTEXT_FOR_ANDROID', '6b. Android receiver receives full ciphertext');
    assert(androidRecvMsg.envelope.iv === 'AQIDBAUGBwgJCgsMDQ4PEA==', '6c. Android receiver receives full IV');
    assert(androidRecvMsg.envelope.isViewOnce === true, '6d. isViewOnce flag is preserved');

    // Test 7: Android receiver opens photo -> starts 8s countdown
    const countdownPromise = androidSender.waitForEvent(e => e.type === 'photo_countdown_started' && e.messageId === 'photo-native-ov-1');

    androidReceiver.ws.send(JSON.stringify({
      type: 'photo_opened',
      sessionId: sId4,
      messageId: 'photo-native-ov-1'
    }));

    const countdownEvent = await countdownPromise;
    assert(Boolean(countdownEvent.expiresAt), '7a. Android receiver opening photo triggers photo_countdown_started');
    assert(countdownEvent.expiresAt > Date.now(), '7b. Countdown expiry is in the future (~8s)');

    // Test 8: Android receiver closes photo early -> immediately consumes
    const expiredPromise = androidSender.waitForEvent(e => e.type === 'photo_expired' && e.messageId === 'photo-native-ov-1');

    androidReceiver.ws.send(JSON.stringify({
      type: 'photo_closed',
      sessionId: sId4,
      messageId: 'photo-native-ov-1'
    }));

    const expiredEvent = await expiredPromise;
    assert(expiredEvent.messageId === 'photo-native-ov-1', '8. Closing photo early immediately permanently expires the One-View photo on server');

    // Test 9: Unsend supported for One-View photos
    const sId5 = generateSessionId();
    const create5 = await createRoom(sId5);
    const auth5 = await authRoom(sId5, '1234', 'android-unsend-peer');

    const unsendSender = await connectClient(sId5, create5.ticket, 'android-unsend-1', {
      platform: 'android-native',
      origin: 'https://localhost'
    });
    const unsendPeer = await connectClient(sId5, auth5.ticket, 'android-unsend-peer', {
      platform: 'android-native',
      origin: 'https://localhost'
    });

    unsendSender.ws.send(JSON.stringify({
      type: 'message',
      sessionId: sId5,
      envelope: {
        id: 'photo-to-unsend',
        type: 'photo',
        isViewOnce: true,
        ciphertext: 'CIPHERTEXT_TO_UNSEND',
        iv: 'AQIDBAUGBwgJCgsMDQ4PEA==',
        timestamp: Date.now()
      }
    }));
    await unsendPeer.waitForEvent(e => e.type === 'message' && e.envelope?.id === 'photo-to-unsend');

    const unsendPromise = unsendPeer.waitForEvent(e => e.type === 'message_unsent' && e.messageId === 'photo-to-unsend');
    unsendSender.ws.send(JSON.stringify({
      type: 'unsend',
      sessionId: sId5,
      messageId: 'photo-to-unsend',
      senderId: 'android-unsend-1'
    }));

    const unsendEvent = await unsendPromise;
    assert(unsendEvent.messageId === 'photo-to-unsend', '9. Sender can successfully unsend One-View photo');

    androidSender.ws.close();
    androidReceiver.ws.close();
    unsendSender.ws.close();
    unsendPeer.ws.close();

    // -----------------------------------------------------------------
    // SECTION 4: NORMAL PHOTO MESSAGING WORKS EVERYWHERE
    // -----------------------------------------------------------------
    console.log('\n--- 4. NORMAL PHOTO MESSAGING REMAINS FULLY FUNCTIONAL ---');

    // Test 10: Normal photo on Desktop Website
    const sId6 = generateSessionId();
    const create6 = await createRoom(sId6);
    const auth6 = await authRoom(sId6, '1234', 'desktop-normal-peer');

    const deskNormalSender = await connectClient(sId6, create6.ticket, 'desk-normal-sender', {
      platform: 'web',
      origin: 'https://u2u.onrender.com'
    });
    const deskNormalPeer = await connectClient(sId6, auth6.ticket, 'desktop-normal-peer', {
      platform: 'web',
      origin: 'https://u2u.onrender.com'
    });

    const deskNormalRecvPromise = deskNormalPeer.waitForEvent(e => e.type === 'message' && e.envelope?.id === 'normal-photo-desk-1');

    deskNormalSender.ws.send(JSON.stringify({
      type: 'message',
      sessionId: sId6,
      envelope: {
        id: 'normal-photo-desk-1',
        type: 'photo',
        isViewOnce: false, // Normal photo
        ciphertext: 'LEGIT_NORMAL_PHOTO_CIPHERTEXT',
        iv: 'AQIDBAUGBwgJCgsMDQ4PEA==',
        timestamp: Date.now()
      }
    }));

    const deskNormalRecv = await deskNormalRecvPromise;
    assert(deskNormalRecv.envelope.isViewOnce === false, '10a. Normal photo delivers with isViewOnce: false');
    assert(deskNormalRecv.envelope.ciphertext === 'LEGIT_NORMAL_PHOTO_CIPHERTEXT', '10b. Desktop website receives complete normal photo ciphertext');
    assert(deskNormalRecv.envelope.iv === 'AQIDBAUGBwgJCgsMDQ4PEA==', '10c. Desktop website receives complete normal photo IV');

    // Test 11: Normal photo on Mobile Website
    const sId7 = generateSessionId();
    const create7 = await createRoom(sId7);
    const auth7 = await authRoom(sId7, '1234', 'mobile-normal-peer');

    const mobNormalSender = await connectClient(sId7, create7.ticket, 'mob-normal-sender', {
      platform: 'web',
      origin: 'https://u2u.onrender.com',
      userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/120.0 Mobile Safari/537.36'
    });
    const mobNormalPeer = await connectClient(sId7, auth7.ticket, 'mobile-normal-peer', {
      platform: 'web',
      origin: 'https://u2u.onrender.com'
    });

    const mobNormalRecvPromise = mobNormalPeer.waitForEvent(e => e.type === 'message' && e.envelope?.id === 'normal-photo-mob-1');

    mobNormalSender.ws.send(JSON.stringify({
      type: 'message',
      sessionId: sId7,
      envelope: {
        id: 'normal-photo-mob-1',
        type: 'photo',
        isViewOnce: false,
        ciphertext: 'LEGIT_MOBILE_NORMAL_PHOTO',
        iv: 'AQIDBAUGBwgJCgsMDQ4PEA==',
        timestamp: Date.now()
      }
    }));

    const mobNormalRecv = await mobNormalRecvPromise;
    assert(mobNormalRecv.envelope.ciphertext === 'LEGIT_MOBILE_NORMAL_PHOTO', '11. Mobile website receives normal photo successfully');

    // Test 12: Normal photo on Native Android
    const sId8 = generateSessionId();
    const create8 = await createRoom(sId8);
    const auth8 = await authRoom(sId8, '1234', 'android-normal-peer');

    const androidNormalSender = await connectClient(sId8, create8.ticket, 'android-normal-sender', {
      platform: 'android-native',
      origin: 'https://localhost'
    });
    const androidNormalPeer = await connectClient(sId8, auth8.ticket, 'android-normal-peer', {
      platform: 'android-native',
      origin: 'https://localhost'
    });

    const androidNormalRecvPromise = androidNormalPeer.waitForEvent(e => e.type === 'message' && e.envelope?.id === 'normal-photo-android-1');

    androidNormalSender.ws.send(JSON.stringify({
      type: 'message',
      sessionId: sId8,
      envelope: {
        id: 'normal-photo-android-1',
        type: 'photo',
        isViewOnce: false,
        ciphertext: 'LEGIT_ANDROID_NORMAL_PHOTO',
        iv: 'AQIDBAUGBwgJCgsMDQ4PEA==',
        timestamp: Date.now()
      }
    }));

    const androidNormalRecv = await androidNormalRecvPromise;
    assert(androidNormalRecv.envelope.ciphertext === 'LEGIT_ANDROID_NORMAL_PHOTO', '12. Native Android receives normal photo successfully');

    deskNormalSender.ws.close();
    deskNormalPeer.ws.close();
    mobNormalSender.ws.close();
    mobNormalPeer.ws.close();
    androidNormalSender.ws.close();
    androidNormalPeer.ws.close();

    // -----------------------------------------------------------------
    // SECTION 5: FRONTEND UI & CODE AUDIT
    // -----------------------------------------------------------------
    console.log('\n--- 5. FRONTEND RESTRICTION & COMPONENT CODE AUDIT ---');

    const photoPreviewCode = fs.readFileSync(path.join(rootDir, 'src/components/modals/PhotoPreviewModal.jsx'), 'utf8');
    const photoBubbleCode = fs.readFileSync(path.join(rootDir, 'src/components/PhotoBubble.jsx'), 'utf8');
    const chatViewCode = fs.readFileSync(path.join(rootDir, 'src/components/ChatView.jsx'), 'utf8');
    const appCssCode = fs.readFileSync(path.join(rootDir, 'src/App.css'), 'utf8');

    assert(photoPreviewCode.includes('isNativeAndroid'), '13a. PhotoPreviewModal imports isNativeAndroid check');
    assert(photoPreviewCode.includes(EXPECTED_GUIDANCE), '13b. PhotoPreviewModal contains exact user-facing guidance message');
    assert(photoPreviewCode.includes('disabled-web'), '13c. PhotoPreviewModal applies disabled-web styling on non-native platform');

    assert(photoBubbleCode.includes('isNativeAndroid'), '14a. PhotoBubble imports isNativeAndroid check');
    assert(photoBubbleCode.includes('photo-restricted-card'), '14b. PhotoBubble defines photo-restricted-card for website');
    assert(photoBubbleCode.includes(EXPECTED_GUIDANCE), '14c. PhotoBubble renders exact user-facing guidance message');
    assert(photoBubbleCode.includes('normal-photo'), '14d. PhotoBubble supports unblurred normal-photo bubbles');

    assert(chatViewCode.includes('ONE_VIEW_RESTRICTED_MESSAGE'), '15a. ChatView defines ONE_VIEW_RESTRICTED_MESSAGE');
    assert(chatViewCode.includes('isViewOnce && !isNativeAndroid()'), '15b. ChatView guards handleSendPhoto against website One-View sending');
    assert(chatViewCode.includes('getClientPlatform'), '15c. ChatView passes clientPlatform on WebSocket connection');

    assert(appCssCode.includes('.photo-restricted-card'), '16a. App.css defines .photo-restricted-card styles');
    assert(appCssCode.includes('.photo-bubble-container.normal-photo'), '16b. App.css defines .photo-bubble-container.normal-photo styles');
    assert(appCssCode.includes('.view-once-toggle-card.disabled-web'), '16c. App.css defines .view-once-toggle-card.disabled-web styles');

  } catch (err) {
    console.error('Fatal error during One-View Photo test execution:', err);
    failed++;
  } finally {
    serverProc.kill();
  }

  console.log('\n================================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runOneViewSuite();
