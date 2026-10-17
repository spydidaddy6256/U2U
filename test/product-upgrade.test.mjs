import { WebSocket } from 'ws';
import crypto from 'crypto';
import { generateAnonymousName, sanitizeDisplayName, validateDisplayName } from '../src/utils/identity.js';
import { AVATARS, getAvatarSvg } from '../src/data/avatars.js';
import {
  generateMasterRecoveryKey,
  deriveProfileId,
  generateAuthProof,
  derivePasswordKey
} from '../src/utils/profileCrypto.js';
import {
  canAccessWebChat,
  setDesktopOverride,
  generateAppDeepLink
} from '../src/utils/platformRouting.js';
import { generateInviteUrl } from '../src/utils/apiConfig.js';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3001';
const WS_URL = process.env.TEST_WS_URL || 'ws://localhost:3001/ws';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'u2u-internal-operator-key-dev';

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

async function runTests() {
  console.log('================================================================');
  console.log('   U2U PRODUCT UPGRADE & ADVANCED CAPABILITY VERIFICATION        ');
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

  // ─────────────────────────────────────────────────────────────
  // 1. Identity Generation, Sanitization & Original Avatars
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 1. Identity Selection & Avatar System ---');

  const name1 = generateAnonymousName();
  const name2 = generateAnonymousName();
  assert(typeof name1 === 'string' && name1.length >= 6, `Generated anonymous name 1 is valid: "${name1}"`);
  assert(typeof name2 === 'string' && name2.length >= 6, `Generated anonymous name 2 is valid: "${name2}"`);

  // Sanitization against XSS & control characters
  const dirtyName = '<script>alert("xss")</script> VelvetFox \u0000\u001F';
  const cleanName = sanitizeDisplayName(dirtyName);
  assert(!cleanName.includes('<') && !cleanName.includes('>') && !cleanName.includes('\u0000'), `XSS and control chars stripped: "${cleanName}"`);

  // Username validation
  assert(validateDisplayName('VelvetFox').valid, 'Valid username "VelvetFox" accepted');
  assert(!validateDisplayName('a').valid, 'Short username (1 char) rejected');
  assert(!validateDisplayName('A'.repeat(25)).valid, 'Overlong username (25 chars) rejected');
  assert(validateDisplayName('Ghost-Whiskers_01').valid, 'Alphanumeric with hyphens/underscores accepted');

  // Avatar presets
  assert(AVATARS && AVATARS.length === 10, `Exactly 10 original avatar presets available (found ${AVATARS.length})`);
  const firstAvatarSvg = getAvatarSvg('neon-neko');
  assert(firstAvatarSvg.includes('<svg') && firstAvatarSvg.includes('</svg>'), 'Avatar "neon-neko" returns valid vector SVG');
  const catAvatarSvg = getAvatarSvg('ghost-whiskers');
  assert(catAvatarSvg.includes('<svg') && catAvatarSvg.includes('</svg>'), 'Avatar "ghost-whiskers" returns valid vector SVG');

  // ─────────────────────────────────────────────────────────────
  // 2. Platform Routing & Deep Link Handoff
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 2. Platform Routing & Safe App Handoff ---');

  // Desktop vs mobile detection in test runner environment (Node)
  // By default, non-browser/desktop environment can access web chat
  assert(canAccessWebChat(), 'Desktop environment allows web chat access');

  // Desktop override functionality
  setDesktopOverride(true);
  assert(canAccessWebChat(), 'canAccessWebChat() remains true when desktop override is enabled');
  setDesktopOverride(false);

  // App Deep Link Generation: passcode strictly preserved in URL fragment
  const deepLink = generateAppDeepLink('token-abc-123', 'pass-xyz-789');
  assert(deepLink.startsWith('u2u://join/token-abc-123#pass-xyz-789'), `App deep link preserves passcode in fragment: ${deepLink}`);
  assert(!deepLink.includes('?passcode='), 'App deep link never leaks passcode in query parameter');

  // Invitation URL generation: never includes preview flags or localhost in production
  const origEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  const prodInvite = generateInviteUrl('tok-999', 'pass-999');
  assert(!prodInvite.includes('localhost'), `Production invite link does not use localhost: ${prodInvite}`);
  assert(!prodInvite.includes('previewAndroidHeader'), 'Production invite link contains no internal preview parameters');
  assert(prodInvite.includes('#pass-999'), 'Passcode is securely retained in URL hash fragment');
  process.env.NODE_ENV = origEnv;

  // ─────────────────────────────────────────────────────────────
  // 3. Zero-Knowledge Permanent Profile Cryptography
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 3. Permanent Profile Cryptographic Primitives ---');

  const recoveryKey = generateMasterRecoveryKey();
  assert(recoveryKey.startsWith('U2U-') && recoveryKey.length >= 24, `Master recovery key generated: ${recoveryKey.slice(0, 12)}...`);

  const profileId1 = await deriveProfileId(recoveryKey);
  const profileId2 = await deriveProfileId(recoveryKey);
  assert(profileId1 === profileId2, 'deriveProfileId() is deterministic and consistent');
  assert(profileId1.startsWith('u2u-') && profileId1.length === 20, `profileId is formatted u2u- hex string: ${profileId1}`);

  const authProof = await generateAuthProof(recoveryKey, 'register');
  assert(typeof authProof === 'string' && authProof.length === 64, 'generateAuthProof() generates valid HMAC proof');

  // Local AES-GCM encryption with PBKDF2 password
  const testPassword = 'CorrectHorseBatteryStaple123!';
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const derivedKey = await derivePasswordKey(testPassword, salt);
  assert(derivedKey && derivedKey.algorithm?.name === 'AES-GCM', 'PBKDF2 derives valid 256-bit AES-GCM key');

  const enc = new TextEncoder();
  const testData = enc.encode('U2U-SECRET-PAYLOAD');
  const ciphertextBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, derivedKey, testData);
  assert(ciphertextBuffer.byteLength > 0, 'AES-256-GCM successfully encrypts profile payload');

  const decryptedBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, derivedKey, ciphertextBuffer);
  const dec = new TextDecoder();
  assert(dec.decode(decryptedBuffer) === 'U2U-SECRET-PAYLOAD', 'AES-256-GCM successfully decrypts with correct password key');

  // Wrong password key
  const wrongKey = await derivePasswordKey('WrongPassword123!', salt);
  let wrongDecryptFailed = false;
  try {
    await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, wrongKey, ciphertextBuffer);
  } catch {
    wrongDecryptFailed = true;
  }
  assert(wrongDecryptFailed, 'Decryption with wrong password key cleanly rejects without leaking plaintext');

  // ─────────────────────────────────────────────────────────────
  // 4. Server API: Permanent Profile Registration & Verification
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 4. Server API: Zero-Knowledge Profiles ---');

  const userRecoveryKey = generateMasterRecoveryKey();
  const testProfileId = await deriveProfileId(userRecoveryKey);
  const testUsername = 'U2U_Tester_' + Date.now().toString().slice(-4);
  const regProof = await generateAuthProof(userRecoveryKey, 'register');

  // Register profile on server
  const regRes = await fetch(`${BASE_URL}/api/profile/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      profileId: testProfileId,
      authProof: regProof,
      username: testUsername,
      avatar: 'solar-kitsune'
    })
  });
  const regData = await regRes.json();
  assert(regRes.ok && regData.success, `Permanent profile registered successfully: @${testUsername}`);

  // Re-registration collision prevention
  const collisionRes = await fetch(`${BASE_URL}/api/profile/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      profileId: testProfileId,
      authProof: regProof,
      username: testUsername,
      avatar: 'solar-kitsune'
    })
  });
  assert(collisionRes.status === 409, 'Duplicate profile registration returns HTTP 409 Conflict');

  // Verify profile with valid proof
  const verifyProof = await generateAuthProof(userRecoveryKey, 'verify');
  const verifyRes = await fetch(`${BASE_URL}/api/profile/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      profileId: testProfileId,
      authProof: verifyProof
    })
  });
  const verifyData = await verifyRes.json();
  assert(verifyRes.ok && verifyData.profile?.username === testUsername, `Profile verified via cryptographic proof: @${verifyData.profile?.username}`);

  // Verification with invalid proof rejected
  const badVerifyRes = await fetch(`${BASE_URL}/api/profile/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      profileId: testProfileId,
      authProof: '0000000000000000000000000000000000000000000000000000000000000000'
    })
  });
  assert(badVerifyRes.status === 403, 'Profile verification with invalid auth proof rejected with HTTP 403');

  // ─────────────────────────────────────────────────────────────
  // 5. Irreversible Permanent Profile Deletion
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 5. Irreversible Profile Deletion ---');

  // Deletion attempt with fake proof fails
  const fakeDeleteRes = await fetch(`${BASE_URL}/api/profile/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      profileId: testProfileId,
      authProof: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
    })
  });
  assert(fakeDeleteRes.status === 403, 'Deletion attempt with forged proof rejected with HTTP 403');

  // Legitimate deletion with valid proof
  const delProof = await generateAuthProof(userRecoveryKey, 'delete');
  const delRes = await fetch(`${BASE_URL}/api/profile/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      profileId: testProfileId,
      authProof: delProof
    })
  });
  const delData = await delRes.json();
  assert(delRes.ok && delData.success, 'Irreversible permanent profile deletion succeeded on server');

  // Verification after deletion must return 404
  const postDelVerifyRes = await fetch(`${BASE_URL}/api/profile/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      profileId: testProfileId,
      authProof: verifyProof
    })
  });
  assert(postDelVerifyRes.status === 404, 'Deleted profile returns HTTP 404 on subsequent verification');

  // Second deletion is idempotent and returns 404
  const secondDelRes = await fetch(`${BASE_URL}/api/profile/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      profileId: testProfileId,
      authProof: delProof
    })
  });
  assert(secondDelRes.status === 404, 'Idempotent deletion: already-deleted profile returns 404 without error');

  // ─────────────────────────────────────────────────────────────
  // 6. Manual Maintenance Mode
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 6. Manual Maintenance Mode Controls ---');

  // Initial maintenance status must be false
  const statusRes1 = await fetch(`${BASE_URL}/api/maintenance/status`);
  const statusData1 = await statusRes1.json();
  assert(statusRes1.ok && statusData1.maintenance === false, 'Maintenance mode is disabled by default');

  // Ordinary unauthorized user cannot toggle maintenance
  const unauthMaintRes = await fetch(`${BASE_URL}/api/admin/maintenance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      enabled: true,
      operatorSecret: 'attacker-wrong-secret'
    })
  });
  assert(unauthMaintRes.status === 403, 'Unauthorized maintenance activation rejected with HTTP 403');

  // Authorized operator enables maintenance
  const enableMaintRes = await fetch(`${BASE_URL}/api/admin/maintenance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      enabled: true,
      message: 'Planned system upgrade in progress',
      estimatedReturn: '15 minutes',
      operatorSecret: ADMIN_SECRET
    })
  });
  const enableData = await enableMaintRes.json();
  assert(enableMaintRes.ok && enableData.maintenance === true, 'Authorized operator enabled maintenance mode');

  // Status reflects active maintenance
  const statusRes2 = await fetch(`${BASE_URL}/api/maintenance/status`);
  const statusData2 = await statusRes2.json();
  assert(statusData2.maintenance === true && statusData2.estimatedReturn === '15 minutes', 'Maintenance status endpoint reflects active maintenance and operator message');

  // Session create returns 503 during maintenance
  const testSessId = generateValidSessionId();
  const testPasscode = 'TestPasscode123!';
  const pcHash = await hashPasscode(testPasscode, testSessId);
  const maintCreateRes = await fetch(`${BASE_URL}/api/session/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: testSessId, passcodeHash: pcHash })
  });
  assert(maintCreateRes.status === 503, 'Session create returns HTTP 503 during active maintenance');

  // Session auth returns 503 during maintenance
  const maintAuthRes = await fetch(`${BASE_URL}/api/session/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: testSessId, passcodeHash: pcHash, clientId: 'c-test' })
  });
  assert(maintAuthRes.status === 503, 'Session auth returns HTTP 503 during active maintenance');

  // Health check remains active even during maintenance
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  assert(healthRes.ok, 'Operational health endpoint /api/health remains accessible during maintenance');

  // Authorized operator disables maintenance
  const disableMaintRes = await fetch(`${BASE_URL}/api/admin/maintenance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      enabled: false,
      operatorSecret: ADMIN_SECRET
    })
  });
  assert(disableMaintRes.ok, 'Authorized operator disabled maintenance mode');

  // Endpoints return to normal operation
  const normalCreateRes = await fetch(`${BASE_URL}/api/session/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: testSessId, passcodeHash: pcHash })
  });
  assert(normalCreateRes.ok, 'Session creation succeeds normally after maintenance mode is disabled');

  // ─────────────────────────────────────────────────────────────
  // 7. Post-Join Identity WebSocket Broadcast & Sync
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 7. Identity Synchronization Over WebSocket ---');

  const sessId = generateValidSessionId();
  const pc = 'Passcode999!';
  const hash = await hashPasscode(pc, sessId);

  const initRes = await fetch(`${BASE_URL}/api/session/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: sessId, passcodeHash: hash })
  });
  const initData = await initRes.json();
  const creatorTicket = initData.ticket;

  const joinAuthRes = await fetch(`${BASE_URL}/api/session/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: sessId, passcodeHash: hash, clientId: 'joiner-client' })
  });
  const joinAuthData = await joinAuthRes.json();
  const joinerTicket = joinAuthData.ticket;

  let creatorReceivedPeerIdentity = false;
  let joinerReceivedPeerIdentity = false;

  const wsCreator = new WebSocket(WS_URL);
  const wsJoiner = new WebSocket(WS_URL);

  await new Promise((resolve) => {
    let creatorOpen = false;
    let joinerOpen = false;

    wsCreator.on('open', () => {
      creatorOpen = true;
      wsCreator.send(JSON.stringify({
        type: 'join',
        sessionId: sessId,
        clientId: 'creator-client',
        ticket: creatorTicket
      }));
      wsCreator.send(JSON.stringify({
        type: 'identity',
        sessionId: sessId,
        clientId: 'creator-client',
        identity: { displayName: 'VelvetFox', avatar: 'neon-neko' }
      }));
      if (joinerOpen) resolve();
    });

    wsJoiner.on('open', () => {
      joinerOpen = true;
      wsJoiner.send(JSON.stringify({
        type: 'join',
        sessionId: sessId,
        clientId: 'joiner-client',
        ticket: joinerTicket
      }));
      wsJoiner.send(JSON.stringify({
        type: 'identity',
        sessionId: sessId,
        clientId: 'joiner-client',
        identity: { displayName: 'QuietComet', avatar: 'shadow-paw' }
      }));
      if (creatorOpen) resolve();
    });

    wsCreator.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'peer_identity' && msg.identity?.displayName === 'QuietComet') {
          creatorReceivedPeerIdentity = true;
        }
        if (msg.type === 'peerIdentities' && msg.identities?.['joiner-client']?.displayName === 'QuietComet') {
          creatorReceivedPeerIdentity = true;
        }
        if (msg.type === 'joined' && msg.peerIdentities?.['joiner-client']?.displayName === 'QuietComet') {
          creatorReceivedPeerIdentity = true;
        }
      } catch {}
    });

    wsJoiner.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'peer_identity' && msg.identity?.displayName === 'VelvetFox') {
          joinerReceivedPeerIdentity = true;
        }
        if (msg.type === 'peerIdentities' && msg.identities?.['creator-client']?.displayName === 'VelvetFox') {
          joinerReceivedPeerIdentity = true;
        }
        if (msg.type === 'joined' && msg.peerIdentities?.['creator-client']?.displayName === 'VelvetFox') {
          joinerReceivedPeerIdentity = true;
        }
      } catch {}
    });
  });

  await sleep(600);
  wsCreator.close();
  wsJoiner.close();

  assert(creatorReceivedPeerIdentity, 'Session creator received peer identity broadcast over WebSocket');
  assert(joinerReceivedPeerIdentity, 'Joining peer received creator identity broadcast over WebSocket');

  // ─────────────────────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────────────────────
  console.log('\n================================================================');
  console.log(`TOTAL PASSED: ${passed}`);
  console.log(`TOTAL FAILED: ${failed}`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
