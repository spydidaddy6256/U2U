import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import proxyaddr from 'proxy-addr';
import { applyUserReaction } from './src/utils/reactions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

// Trust proxy for secure IP extraction behind reverse proxies (Render, Cloudflare, etc.)
// Trust loopback and local private networks by default so public spoofed headers are not trusted
const trustProxyConfig = process.env.TRUST_PROXY
  ? (isNaN(Number(process.env.TRUST_PROXY)) ? process.env.TRUST_PROXY : Number(process.env.TRUST_PROXY))
  : 'loopback, linklocal, uniquelocal';
app.set('trust proxy', trustProxyConfig);

// Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(self), geolocation=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob: data:; connect-src 'self' ws: wss:; font-src 'self' data:; object-src 'none'; frame-ancestors 'none';"
  );
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Capacitor & local mobile client CORS middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (origin === 'https://localhost' || origin === 'http://localhost' || origin.startsWith('capacitor://'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// JSON Body Parser with strict limit
app.use(express.json({ limit: '10mb' }));
app.use(express.text({ type: 'text/plain', limit: '1mb' }));

// Safe JSON parse & payload size error handler (Prevents leaking stack traces or HTML errors)
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Malformed JSON payload' });
  }
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Payload too large' });
  }
  next(err);
});

// Ephemeral In-Memory Store: Strict Zero-Knowledge Rooms
// Map<sessionId, {
//   id: string,
//   passcodeHash: string,
//   createdAt: number,
//   expiresAt: number,
//   burned: boolean,
//   participants: Map<clientId, ws>,
//   messages: Array<envelope>,
//   photoTimers: Map<messageId, NodeJS.Timeout>,
//   voiceTimers: Map<messageId, NodeJS.Timeout>,
//   disconnectTimers: Map<clientId, NodeJS.Timeout>,
//   peerLeftStatus: object|null,
//   leftClientIds: Set<clientId>,
//   deletedMessageIds: Set<messageId>
// }>
const rooms = new Map();

// One-time authentication & rolling reconnect tickets
// Map<ticketId, { sessionId, clientId, expiresAt }>
const authTickets = new Map();

// Rate limiting trackers
const createRateTracker = new Map();     // ip -> { count, resetAt }
const authRateTracker = new Map();       // `${ip}:${sessionId}` -> { count, resetAt, lockedUntil }
const joinRateTracker = new Map();       // ip -> { count, resetAt, lockedUntil }
const ipWsConnections = new Map();       // ip -> Set<ws>
const ipWsConnectAttempts = new Map();   // ip -> { count, resetAt }
const healthRateTracker = new Map();     // ip -> { count, resetAt }

// Manual Operator Maintenance Mode Configuration (Disabled by default)
const maintenanceMode = {
  enabled: process.env.MAINTENANCE_MODE === 'true' || false,
  message: process.env.MAINTENANCE_MESSAGE || 'U2U is temporarily undergoing scheduled maintenance. Existing sessions are preserved and service will resume shortly.',
  estimatedReturn: process.env.MAINTENANCE_ESTIMATED_RETURN || null
};

// Operator Maintenance Secret (Server-side deployment env variable only; never exposed to frontend)
const OPERATOR_SECRET = process.env.OPERATOR_MAINTENANCE_SECRET || process.env.ADMIN_SECRET || 'u2u-internal-operator-key-dev';

// Zero-Knowledge Permanent Profile In-Memory Storage
// Map<profileId, { profileId, username, avatar, authProof, createdAt }>
const permanentProfiles = new Map();

// Maintenance Mode Interceptor Middleware
function checkMaintenance(req, res, next) {
  if (maintenanceMode.enabled) {
    return res.status(503).json({
      error: 'Service Temporarily Unavailable: Scheduled Maintenance',
      maintenance: true,
      message: maintenanceMode.message,
      estimatedReturn: maintenanceMode.estimatedReturn
    });
  }
  next();
}

// Secure Join Token mappings
const joinTokens = new Map(); // token -> sessionId
const usedTokens = new Map(); // token -> sessionId

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const PHOTO_LIFETIME_MS = 8 * 1000; // Exactly 8 seconds authoritative lifetime once opened
const VOICE_NOTE_UNLISTENED_LIFETIME_MS = 180 * 1000; // 3 minutes unplayed
const VOICE_NOTE_LISTENED_LIFETIME_MS = 60 * 1000; // 60 seconds after full play
const RECONNECT_GRACE_PERIOD_MS = process.env.RECONNECT_GRACE_PERIOD_MS
  ? parseInt(process.env.RECONNECT_GRACE_PERIOD_MS, 10)
  : 30 * 1000; // 30 seconds reconnection grace period for temporary interruptions

// Normalize IPv6-mapped IPv4 addresses (e.g. ::ffff:127.0.0.1 -> 127.0.0.1)
function normalizeIp(ip) {
  if (!ip || typeof ip !== 'string') return '127.0.0.1';
  let clean = ip.trim();
  if (clean.startsWith('::ffff:')) {
    clean = clean.slice(7);
  }
  return clean;
}

function isLoopbackIp(ip) {
  const normalized = normalizeIp(ip);
  return normalized === '127.0.0.1' || normalized === '::1';
}

// Safe IP helper supporting both Express Request and WebSocket IncomingMessage
function getClientIp(req) {
  if (req.ip) return normalizeIp(req.ip);
  const trustFn = app.get('trust proxy fn');
  if (trustFn) {
    try {
      const ip = proxyaddr(req, trustFn);
      if (ip) return normalizeIp(ip);
    } catch {
      // Fallback below
    }
  }
  return normalizeIp(req.socket?.remoteAddress || '127.0.0.1');
}

// Rate Limiter: Session Creation (max 15 creates per 15 min per IP)
function checkCreateRateLimit(ip) {
  const now = Date.now();
  let record = createRateTracker.get(ip);
  if (!record || now > record.resetAt) {
    record = { count: 1, resetAt: now + 15 * 60 * 1000 };
    createRateTracker.set(ip, record);
    return { allowed: true };
  }
  if (record.count >= 15) {
    const waitSeconds = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, waitSeconds };
  }
  record.count += 1;
  return { allowed: true };
}

// Rate Limiter: Authentication Attempts (max 5 failed attempts before 10-min lockout)
function checkAuthRateLimit(key) {
  const now = Date.now();
  const record = authRateTracker.get(key);
  if (record) {
    if (record.lockedUntil && now < record.lockedUntil) {
      const waitSeconds = Math.ceil((record.lockedUntil - now) / 1000);
      return { allowed: false, waitSeconds };
    }
    if (now > record.resetAt) {
      authRateTracker.delete(key);
    }
  }
  return { allowed: true };
}

function recordFailedAuth(key) {
  const now = Date.now();
  let record = authRateTracker.get(key);
  if (!record || now > record.resetAt) {
    record = { count: 1, resetAt: now + 10 * 60 * 1000, lockedUntil: 0 };
  } else {
    record.count += 1;
    if (record.count >= 5) {
      record.lockedUntil = now + 10 * 60 * 1000;
    }
  }
  authRateTracker.set(key, record);
}

function clearFailedAuth(key) {
  authRateTracker.delete(key);
}

// Rate Limiter: Join Link Claims (max 20 attempts per 10 min per IP)
function checkJoinLinkRateLimit(ip) {
  const now = Date.now();
  let record = joinRateTracker.get(ip);
  if (record) {
    if (record.lockedUntil && now < record.lockedUntil) {
      const waitSeconds = Math.ceil((record.lockedUntil - now) / 1000);
      return { allowed: false, waitSeconds };
    }
    if (now > record.resetAt) {
      joinRateTracker.delete(ip);
      record = null;
    }
  }
  if (!record) {
    record = { count: 1, resetAt: now + 10 * 60 * 1000, lockedUntil: 0 };
  } else {
    record.count += 1;
    if (record.count >= 20) {
      record.lockedUntil = now + 10 * 60 * 1000;
      joinRateTracker.set(ip, record);
      return { allowed: false, waitSeconds: 600 };
    }
  }
  joinRateTracker.set(ip, record);
  return { allowed: true };
}

// Rate Limiter: Health Endpoint (max 60 per min)
function checkHealthRateLimit(ip) {
  const now = Date.now();
  let record = healthRateTracker.get(ip);
  if (!record || now > record.resetAt) {
    record = { count: 1, resetAt: now + 60 * 1000 };
    healthRateTracker.set(ip, record);
    return true;
  }
  record.count += 1;
  return record.count <= 60;
}

// Helper: Authoritative voice note countdown timer
function startVoiceUnreadTimer(room, targetMsg) {
  if (!room || !targetMsg || targetMsg.type !== 'voice') return;
  if (targetMsg.isExpired || targetMsg.isUnsent) return;
  if (targetMsg.voiceExpiresAt || room.voiceTimers.has(targetMsg.id)) return;

  const messageId = targetMsg.id;
  const expiresAt = Date.now() + VOICE_NOTE_UNLISTENED_LIFETIME_MS;
  targetMsg.voiceTimerType = 'unread';
  targetMsg.voiceExpiresAt = expiresAt;

  for (const pWs of room.participants.values()) {
    if (pWs.readyState === WebSocket.OPEN) {
      pWs.send(JSON.stringify({
        type: 'voice_countdown_started',
        messageId,
        timerType: 'unread',
        expiresAt
      }));
    }
  }

  const timer = setTimeout(() => {
    targetMsg.isExpired = true;
    targetMsg.ciphertext = null;
    targetMsg.iv = null;
    room.voiceTimers.delete(messageId);

    const idx = room.messages.findIndex(m => m.id === messageId);
    if (idx !== -1) room.messages.splice(idx, 1);
    if (!room.deletedMessageIds) room.deletedMessageIds = new Set();
    room.deletedMessageIds.add(messageId);

    for (const pWs of room.participants.values()) {
      if (pWs.readyState === WebSocket.OPEN) {
        pWs.send(JSON.stringify({
          type: 'voice_expired',
          messageId
        }));
      }
    }
  }, VOICE_NOTE_UNLISTENED_LIFETIME_MS);

  room.voiceTimers.set(messageId, timer);
}

// Periodic cleanup of expired rooms, tickets, and rate-limit records
setInterval(() => {
  const now = Date.now();

  // Clear expired tickets
  for (const [ticket, val] of authTickets.entries()) {
    if (now > val.expiresAt) {
      authTickets.delete(ticket);
    }
  }

  // Clear expired rooms
  for (const [sessionId, room] of rooms.entries()) {
    if (now >= room.expiresAt || room.burned) {
      if (room.joinToken) {
        joinTokens.delete(room.joinToken);
        usedTokens.delete(room.joinToken);
      }
      for (const timer of room.photoTimers.values()) clearTimeout(timer);
      for (const timer of room.voiceTimers.values()) clearTimeout(timer);
      if (room.disconnectTimers) {
        for (const timer of room.disconnectTimers.values()) clearTimeout(timer);
        room.disconnectTimers.clear();
      }
      for (const client of room.participants.values()) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'session_expired' }));
          client.close();
        }
      }
      rooms.delete(sessionId);
    }
  }

  // Clear old rate limiting entries
  for (const [ip, rec] of createRateTracker.entries()) {
    if (now > rec.resetAt) createRateTracker.delete(ip);
  }
  for (const [key, rec] of authRateTracker.entries()) {
    if (now > rec.resetAt && (!rec.lockedUntil || now > rec.lockedUntil)) {
      authRateTracker.delete(key);
    }
  }
  for (const [ip, rec] of joinRateTracker.entries()) {
    if (now > rec.resetAt && (!rec.lockedUntil || now > rec.lockedUntil)) {
      joinRateTracker.delete(ip);
    }
  }
  for (const [ip, rec] of ipWsConnectAttempts.entries()) {
    if (now > rec.resetAt) ipWsConnectAttempts.delete(ip);
  }
  for (const [ip, rec] of healthRateTracker.entries()) {
    if (now > rec.resetAt) healthRateTracker.delete(ip);
  }
}, 30 * 1000);

// Maintenance Status (Public query)
app.get('/api/maintenance/status', (req, res) => {
  res.json({
    maintenance: maintenanceMode.enabled,
    enabled: maintenanceMode.enabled,
    message: maintenanceMode.message,
    estimatedReturn: maintenanceMode.estimatedReturn
  });
});

// Maintenance Control (Authorized Operator only via header / Bearer token / body secret)
app.post('/api/admin/maintenance', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const reqSecret = req.headers['x-operator-secret'] || token || req.body?.operatorSecret;

  if (!reqSecret || reqSecret !== OPERATOR_SECRET) {
    return res.status(403).json({ error: 'Unauthorized operator access' });
  }

  const { enabled, message, estimatedReturn } = req.body;
  if (typeof enabled === 'boolean') {
    maintenanceMode.enabled = enabled;
  }
  if (typeof message === 'string' && message.trim()) {
    maintenanceMode.message = message.trim();
  }
  if (estimatedReturn !== undefined) {
    maintenanceMode.estimatedReturn = estimatedReturn ? String(estimatedReturn).trim() : null;
  }

  res.json({
    success: true,
    maintenance: maintenanceMode.enabled,
    enabled: maintenanceMode.enabled,
    message: maintenanceMode.message,
    estimatedReturn: maintenanceMode.estimatedReturn
  });
});

// Permanent Profiles: Register (Zero-Knowledge)
app.post('/api/profile/register', (req, res) => {
  if (maintenanceMode.enabled) {
    return res.status(503).json({ error: 'Maintenance mode enabled', maintenance: true });
  }

  const { profileId, username, avatar, authProof } = req.body;
  if (!profileId || typeof profileId !== 'string' || !/^u2u-[a-f0-9]{16}$/.test(profileId)) {
    return res.status(400).json({ error: 'Invalid profile ID format' });
  }
  if (!username || typeof username !== 'string' || username.trim().length < 2 || username.trim().length > 24) {
    return res.status(400).json({ error: 'Username must be between 2 and 24 characters' });
  }
  if (!authProof || typeof authProof !== 'string' || !/^[a-f0-9]{64}$/.test(authProof)) {
    return res.status(400).json({ error: 'Valid cryptographic authentication proof required' });
  }
  if (avatar && typeof avatar !== 'string') {
    return res.status(400).json({ error: 'Invalid avatar format' });
  }

  const cleanUsername = username.replace(/<[^>]*>/g, '').trim().slice(0, 24);
  const cleanAvatar = avatar ? avatar.slice(0, 2000000) : 'neon-neko';

  if (permanentProfiles.has(profileId)) {
    return res.status(409).json({ error: 'Profile ID already registered' });
  }

  for (const p of permanentProfiles.values()) {
    if (p.username.toLowerCase() === cleanUsername.toLowerCase()) {
      return res.status(409).json({ error: 'Username is already taken' });
    }
  }

  const authHash = crypto.createHash('sha256').update(`U2U-SERVER-PROOF:${authProof}`).digest('hex');

  permanentProfiles.set(profileId, {
    profileId,
    username: cleanUsername,
    avatar: cleanAvatar,
    authHash,
    createdAt: Date.now()
  });

  res.json({
    success: true,
    profileId,
    username: cleanUsername,
    avatar: cleanAvatar
  });
});

// Permanent Profiles: Verify Existence
app.post('/api/profile/verify', (req, res) => {
  const { profileId, authProof } = req.body;
  if (!profileId || typeof profileId !== 'string') {
    return res.status(400).json({ error: 'Profile ID required' });
  }
  const profile = permanentProfiles.get(profileId);
  if (!profile) {
    return res.status(404).json({ exists: false, error: 'Profile not found' });
  }
  if (authProof) {
    const authHash = crypto.createHash('sha256').update(`U2U-SERVER-PROOF:${authProof}`).digest('hex');
    if (profile.authHash !== authHash) {
      return res.status(403).json({ error: 'Invalid cryptographic authentication proof' });
    }
  }
  res.json({
    exists: true,
    profile: {
      profileId: profile.profileId,
      username: profile.username,
      avatar: profile.avatar
    },
    profileId: profile.profileId,
    username: profile.username,
    avatar: profile.avatar
  });
});

// Permanent Profiles: Delete (Irreversible by design)
app.post('/api/profile/delete', (req, res) => {
  const { profileId, authProof } = req.body;
  if (!profileId || typeof profileId !== 'string' || !/^u2u-[a-f0-9]{16}$/.test(profileId)) {
    return res.status(400).json({ error: 'Invalid profile ID format' });
  }
  if (!authProof || typeof authProof !== 'string' || !/^[a-f0-9]{64}$/.test(authProof)) {
    return res.status(400).json({ error: 'Cryptographic proof of possession required for deletion' });
  }

  const profile = permanentProfiles.get(profileId);
  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }
  const authHash = crypto.createHash('sha256').update(`U2U-SERVER-PROOF:${authProof}`).digest('hex');
  if (profile.authHash !== authHash) {
    return res.status(403).json({ error: 'Invalid cryptographic authentication proof' });
  }

  permanentProfiles.delete(profileId);

  res.json({
    success: true,
    deleted: true,
    message: 'Profile has been irreversibly deleted from server records'
  });
});

// API 1: Create Session (Zero-Knowledge: Server NEVER receives or stores passcode)
app.post('/api/session/create', checkMaintenance, (req, res) => {
  const ip = getClientIp(req);
  const rateCheck = checkCreateRateLimit(ip);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      error: `Too many session creation requests. Please wait ${rateCheck.waitSeconds}s.`
    });
  }

  const { sessionId, passcodeHash } = req.body;
  if (!sessionId || !passcodeHash || typeof sessionId !== 'string' || typeof passcodeHash !== 'string') {
    return res.status(400).json({ error: 'Session ID and Passcode hash are required' });
  }

  const cleanSessionId = sessionId.trim().toUpperCase();

  // Validate format (4-4-2 alphanumeric)
  if (!/^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{2}$/.test(cleanSessionId)) {
    return res.status(400).json({ error: 'Invalid Session ID format' });
  }

  // Validate hash format (SHA-256 hex string)
  if (!/^[a-f0-9]{64}$/i.test(passcodeHash)) {
    return res.status(400).json({ error: 'Invalid Passcode hash format' });
  }

  // Check collision
  if (rooms.has(cleanSessionId)) {
    const existing = rooms.get(cleanSessionId);
    if (!existing.burned && Date.now() < existing.expiresAt) {
      return res.status(409).json({ error: 'Session ID collision, please generate a new ID' });
    }
  }

  const now = Date.now();
  const joinToken = crypto.randomBytes(24).toString('base64url');

  const room = {
    id: cleanSessionId,
    passcodeHash,
    joinToken,
    joinTokenUsed: false,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
    burned: false,
    participants: new Map(),
    participantHistory: new Set(),
    messages: [],
    photoTimers: new Map(),
    voiceTimers: new Map(),
    disconnectTimers: new Map(),
    peerLeftStatus: null,
    leftClientIds: new Set(),
    deletedMessageIds: new Set(),
    hadTwoParticipants: false
  };

  rooms.set(cleanSessionId, room);
  joinTokens.set(joinToken, cleanSessionId);

  // Issue one-time ticket for creator
  const ticket = crypto.randomBytes(24).toString('hex');
  authTickets.set(ticket, {
    sessionId: cleanSessionId,
    expiresAt: now + 60 * 1000
  });

  return res.json({
    success: true,
    sessionId: cleanSessionId,
    expiresAt: room.expiresAt,
    ticket,
    joinToken
  });
});

// API 2: Authenticate & Join Session (Strict Server-Side Verification + Rate Limiting)
app.post('/api/session/auth', checkMaintenance, (req, res) => {
  const ip = getClientIp(req);
  const { sessionId, passcodeHash, clientId } = req.body;

  if (!sessionId || !passcodeHash || typeof sessionId !== 'string' || typeof passcodeHash !== 'string') {
    return res.status(400).json({ error: 'Session ID and Passcode are required' });
  }

  const cleanSessionId = sessionId.trim().toUpperCase();
  const rateLimitKey = `${ip}:${cleanSessionId}`;

  const rateCheck = checkAuthRateLimit(rateLimitKey);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      error: `Too many failed attempts. Please wait ${rateCheck.waitSeconds}s before trying again.`
    });
  }

  const room = rooms.get(cleanSessionId);
  const now = Date.now();

  // Verification failure
  if (!room || room.burned || now >= room.expiresAt || room.passcodeHash !== passcodeHash) {
    recordFailedAuth(rateLimitKey);
    return res.status(401).json({
      error: "We couldn't verify this session. Check the Session ID and passcode and try again."
    });
  }

  // If client already left this session, deny re-entry
  if (room.leftClientIds?.has(clientId)) {
    return res.status(403).json({
      error: 'SESSION_LEFT',
      message: 'You have left this session. Re-entry is not permitted.'
    });
  }

  // If session has already ended (peer departed) and this is not an existing remaining participant
  if (room.peerLeftStatus && (!clientId || !room.participantHistory?.has(clientId))) {
    return res.status(403).json({
      error: 'SESSION_TERMINATED',
      message: 'This session has ended.'
    });
  }

  // Check 2-participant limit
  const isReconnecting = clientId && (room.participants.has(clientId) || room.participantHistory?.has(clientId));
  if (!isReconnecting && room.participants.size >= 2) {
    return res.status(403).json({
      error: 'This session is full. Exactly two participants are permitted.'
    });
  }

  if (clientId) {
    if (!room.participantHistory) room.participantHistory = new Set();
    room.participantHistory.add(clientId);
  }

  // Invalidate join token once second participant joins
  if (!isReconnecting && (room.participants.size === 1 || room.participantHistory?.size >= 2)) {
    room.hadTwoParticipants = true;
    room.joinTokenUsed = true;
    if (room.joinToken) {
      joinTokens.delete(room.joinToken);
      usedTokens.set(room.joinToken, cleanSessionId);
    }
  }

  // Cancel disconnect timer on successful auth reconnect
  if (room.disconnectTimers?.has(clientId)) {
    clearTimeout(room.disconnectTimers.get(clientId));
    room.disconnectTimers.delete(clientId);
  }

  clearFailedAuth(rateLimitKey);

  const ticket = crypto.randomBytes(24).toString('hex');
  authTickets.set(ticket, {
    sessionId: cleanSessionId,
    clientId,
    expiresAt: now + 60 * 1000
  });

  return res.json({
    success: true,
    sessionId: cleanSessionId,
    expiresAt: room.expiresAt,
    participantsCount: room.participants.size,
    ticket
  });
});

// API: Intentional Session Leave (Page Unload Beacon / Explicit Leave)
app.post('/api/session/leave', (req, res) => {
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch {}
  }
  const sessionId = body?.sessionId;
  const clientId = body?.clientId;

  if (!sessionId || !clientId || typeof sessionId !== 'string' || typeof clientId !== 'string') {
    return res.status(400).json({ error: 'Session ID and Client ID required' });
  }

  const cleanId = sessionId.trim().toUpperCase();
  const room = rooms.get(cleanId);
  if (room) {
    if (room.disconnectTimers?.has(clientId)) {
      clearTimeout(room.disconnectTimers.get(clientId));
      room.disconnectTimers.delete(clientId);
    }

    const pWs = room.participants.get(clientId);
    if (pWs) {
      pWs.isIntentionalLeave = true;
      room.participants.delete(clientId);
      try { pWs.close(1001, 'Going Away'); } catch {}
    }

    if (!room.leftClientIds) room.leftClientIds = new Set();
    room.leftClientIds.add(clientId);

    if (!room.peerLeftStatus) {
      const leaveTimestamp = Date.now();
      room.peerLeftStatus = {
        text: 'User left the session',
        timestamp: leaveTimestamp,
        departedClientId: clientId
      };

      for (const clientWs of room.participants.values()) {
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(JSON.stringify({
            type: 'peer_left_permanent',
            text: 'User left the session',
            timestamp: leaveTimestamp
          }));
        }
      }
    }
  }

  return res.json({ success: true });
});

// API 3: Verify Join Token Status
app.get('/api/session/join/:token', checkMaintenance, (req, res) => {
  const { token } = req.params;
  const now = Date.now();

  if (usedTokens.has(token)) {
    const sId = usedTokens.get(token);
    const r = rooms.get(sId);
    if (!r || r.burned || now >= r.expiresAt) {
      return res.status(410).json({
        valid: false,
        error: 'EXPIRED',
        message: 'This session has expired.'
      });
    }
    return res.status(403).json({
      valid: false,
      error: 'FULL',
      message: 'This session already has two participants.'
    });
  }

  if (!token || !joinTokens.has(token)) {
    return res.status(404).json({
      valid: false,
      error: 'INVALID_LINK',
      message: 'This invite link is no longer valid.'
    });
  }

  const sessionId = joinTokens.get(token);
  const room = rooms.get(sessionId);

  if (!room || room.burned || now >= room.expiresAt) {
    return res.status(410).json({
      valid: false,
      error: 'EXPIRED',
      message: 'This session has expired.'
    });
  }

  if (room.joinTokenUsed || room.participants.size >= 2) {
    return res.status(403).json({
      valid: false,
      error: 'FULL',
      message: 'This session already has two participants.'
    });
  }

  return res.json({
    valid: true,
    sessionId: room.id,
    expiresAt: room.expiresAt
  });
});

// API 4: Claim Join Token (Zero-Knowledge: Passcode is NEVER transmitted or returned)
app.post('/api/session/join/:token', checkMaintenance, (req, res) => {
  const { token } = req.params;
  const { clientId } = req.body;
  const ip = getClientIp(req);
  const now = Date.now();

  const rateCheck = checkJoinLinkRateLimit(ip);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      error: 'RATE_LIMITED',
      message: `Too many attempts. Please wait ${rateCheck.waitSeconds}s.`
    });
  }

  if (usedTokens.has(token)) {
    const sId = usedTokens.get(token);
    const r = rooms.get(sId);
    if (!r || r.burned || now >= r.expiresAt) {
      return res.status(410).json({
        error: 'EXPIRED',
        message: 'This session has expired.'
      });
    }
    return res.status(403).json({
      error: 'FULL',
      message: 'This session already has two participants.'
    });
  }

  if (!token || !joinTokens.has(token)) {
    return res.status(404).json({
      error: 'INVALID_LINK',
      message: 'This invite link is no longer valid.'
    });
  }

  const sessionId = joinTokens.get(token);
  const room = rooms.get(sessionId);

  if (!room || room.burned || now >= room.expiresAt) {
    return res.status(410).json({
      error: 'EXPIRED',
      message: 'This session has expired.'
    });
  }

  const isReconnecting = clientId && room.participants.has(clientId);
  if (!isReconnecting && (room.joinTokenUsed || room.participants.size >= 2)) {
    return res.status(403).json({
      error: 'FULL',
      message: 'This session already has two participants.'
    });
  }

  // Consume join token
  room.joinTokenUsed = true;
  joinTokens.delete(token);
  usedTokens.set(token, room.id);

  const ticket = crypto.randomBytes(24).toString('hex');
  authTickets.set(ticket, {
    sessionId: room.id,
    clientId,
    expiresAt: now + 60 * 1000
  });

  return res.json({
    success: true,
    sessionId: room.id,
    expiresAt: room.expiresAt,
    ticket
  });
});

// Health check with rate limiting
app.get('/api/health', (req, res) => {
  const ip = getClientIp(req);
  if (!checkHealthRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many health check requests' });
  }
  res.json({ status: 'ok', activeSessions: rooms.size });
});

// Global catch-all production error handler (No stack traces or internal paths leaked)
app.use((err, req, res, _next) => {
  if (res.headersSent) return;
  return res.status(500).json({ error: 'An unexpected error occurred' });
});

// Serve frontend static assets
const publicPath = path.join(__dirname, 'public');
const distPath = path.join(__dirname, 'dist');
app.use(express.static(publicPath));
app.use(express.static(distPath));
app.use((req, res) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/ws')) return;
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.sendFile(path.join(__dirname, 'index.html'), (err2) => {
        if (err2) res.status(200).send('U2U Server running');
      });
    }
  });
});

// WebSocket Server with Payload Size Enforcement (10MB limit)
const wss = new WebSocketServer({
  server,
  path: '/ws',
  maxPayload: 10 * 1024 * 1024 // 10MB max to prevent payload bomb DoS
});

// WebSocket Connection Handling with Differentiated Rate Limiting & BOLA Prevention
wss.on('connection', (ws, req) => {
  const clientIp = getClientIp(req);

  // Track concurrent connections per IP (max 15)
  if (!ipWsConnections.has(clientIp)) {
    ipWsConnections.set(clientIp, new Set());
  }
  const currentConns = ipWsConnections.get(clientIp);
  if (currentConns.size >= 15) {
    ws.send(JSON.stringify({
      type: 'error',
      code: 'CONNECTION_LIMIT',
      message: 'Too many active connections from this IP.'
    }));
    ws.close();
    return;
  }
  currentConns.add(ws);

  // Connection attempts rate limiting per IP (max 30 connects per min, relaxed to 200 only for genuine loopback in non-production)
  const now = Date.now();
  let attemptRec = ipWsConnectAttempts.get(clientIp);
  if (!attemptRec || now > attemptRec.resetAt) {
    attemptRec = { count: 1, resetAt: now + 60 * 1000 };
  } else {
    attemptRec.count += 1;
  }
  ipWsConnectAttempts.set(clientIp, attemptRec);

  const socketIp = req.socket?.remoteAddress || '';
  const isPhysicalLoopback = isLoopbackIp(socketIp);
  const hasForwardedHeader = Boolean(req.headers['x-forwarded-for']);
  const nodeEnv = (process.env.NODE_ENV || '').toLowerCase().trim();
  const isProduction = nodeEnv === 'production' || nodeEnv === 'prod';

  // Genuine loopback connection requires:
  // 1. Not in production (production always strictly enforces 30/min limit)
  // 2. Physical TCP socket is loopback (127.0.0.1 / ::1)
  // 3. No forwarded header (never trust client-supplied X-Forwarded-For as proof of localhost)
  // 4. Resolved client IP is loopback
  const isGenuineLoopback = !isProduction && isPhysicalLoopback && !hasForwardedHeader && isLoopbackIp(clientIp);
  const maxAttempts = isGenuineLoopback ? 200 : 30;

  if (attemptRec.count > maxAttempts) {
    currentConns.delete(ws);
    if (currentConns.size === 0) ipWsConnections.delete(clientIp);
    ws.send(JSON.stringify({
      type: 'error',
      code: 'RATE_LIMITED',
      message: 'Too many connection attempts. Please wait.'
    }));
    ws.close();
    return;
  }

  let currentSessionId = null;
  let currentClientId = null;
  let isAuthenticated = false;

  // Differentiated per-socket event rate limiting (5-second sliding window)
  let windowStart = Date.now();
  let lowCostCount = 0;   // typing, seen, delivered (max 40/5s)
  let normalCostCount = 0; // text messages, reactions, reply (max 25/5s)
  let highCostCount = 0;   // media, clear, burn, photo_opened, photo_closed (max 10/5s)

  const checkEventRate = (costType = 'normal') => {
    const tNow = Date.now();
    if (tNow - windowStart > 5000) {
      windowStart = tNow;
      lowCostCount = 0;
      normalCostCount = 0;
      highCostCount = 0;
    }

    if (costType === 'low') {
      lowCostCount += 1;
      return lowCostCount <= 40;
    } else if (costType === 'high') {
      highCostCount += 1;
      return highCostCount <= 10;
    } else {
      normalCostCount += 1;
      return normalCostCount <= 25;
    }
  };

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (!msg || typeof msg !== 'object') return;

      const eventType = msg.type;
      const isLowCost = ['typing', 'seen', 'delivered', 'message:delivered', 'message:read'].includes(eventType);
      const isHighCost = ['photo_opened', 'photo_closed', 'photo_consumed', 'voice_note_ended', 'clear_chat', 'burn_session'].includes(eventType) || (eventType === 'message' && msg.envelope?.type !== 'text');

      const costCategory = isLowCost ? 'low' : (isHighCost ? 'high' : 'normal');

      if (!checkEventRate(costCategory)) {
        ws.send(JSON.stringify({
          type: 'error',
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please slow down.'
        }));
        return;
      }

      switch (eventType) {
        case 'join': {
          const { sessionId, ticket, clientId } = msg;

          if (!sessionId || !ticket || !clientId || typeof sessionId !== 'string' || typeof clientId !== 'string') {
            ws.send(JSON.stringify({
              type: 'error',
              code: 'UNAUTHORIZED',
              message: "We couldn't verify this session."
            }));
            ws.close();
            return;
          }

          const cleanId = sessionId.trim().toUpperCase();

          const ticketRecord = authTickets.get(ticket);
          if (!ticketRecord || ticketRecord.sessionId !== cleanId || Date.now() > ticketRecord.expiresAt) {
            ws.send(JSON.stringify({
              type: 'error',
              code: 'INVALID_TICKET',
              message: 'Authentication session expired. Please verify again.'
            }));
            ws.close();
            return;
          }

          // Consume ticket
          authTickets.delete(ticket);

          const room = rooms.get(cleanId);
          if (!room || room.burned || Date.now() >= room.expiresAt) {
            ws.send(JSON.stringify({
              type: 'error',
              code: 'NOT_FOUND',
              message: 'This session is no longer available.'
            }));
            ws.close();
            return;
          }

          // If client already intentionally left this session, deny re-entry
          if (room.leftClientIds?.has(clientId)) {
            ws.send(JSON.stringify({
              type: 'error',
              code: 'SESSION_LEFT',
              message: 'You have left this session. Re-entry is not permitted.'
            }));
            ws.close();
            return;
          }

          // If session has already ended (peer departed) and this is not an existing remaining participant
          if (room.peerLeftStatus && (!clientId || !room.participantHistory?.has(clientId))) {
            ws.send(JSON.stringify({
              type: 'error',
              code: 'SESSION_TERMINATED',
              message: 'This session has ended.'
            }));
            ws.close();
            return;
          }

          // Strict 2-participant limit
          const isReconnecting = clientId && (room.participants.has(clientId) || room.participantHistory?.has(clientId));
          if (!isReconnecting && room.participants.size >= 2) {
            ws.send(JSON.stringify({
              type: 'error',
              code: 'ROOM_FULL',
              message: 'This session is full. Exactly two participants are permitted.'
            }));
            ws.close();
            return;
          }

          // Authenticate connection
          isAuthenticated = true;
          currentSessionId = cleanId;
          currentClientId = clientId;

          if (!room.participantHistory) room.participantHistory = new Set();
          room.participantHistory.add(clientId);

          if (room.participants.size >= 1 || room.participantHistory.size >= 2) {
            room.hadTwoParticipants = true;
          }

          // Issue rolling reconnect ticket (1-hour window, capped at room expiry)
          const reconnectTicket = crypto.randomBytes(24).toString('hex');
          authTickets.set(reconnectTicket, {
            sessionId: cleanId,
            clientId,
            expiresAt: Math.min(room.expiresAt, Date.now() + 60 * 60 * 1000)
          });

          // Cancel disconnect timer if reconnected
          if (room.disconnectTimers?.has(clientId)) {
            clearTimeout(room.disconnectTimers.get(clientId));
            room.disconnectTimers.delete(clientId);
          }

          // Safely supersede any existing connection for this clientId without race conditions
          const existingWs = room.participants.get(clientId);
          if (existingWs && existingWs !== ws) {
            existingWs.isReplaced = true;
            try {
              existingWs.close();
            } catch {}
          }

          ws.isReplaced = false;
          room.participants.set(clientId, ws);

          // Check voice & photo timeouts on join
          const joinNow = Date.now();
          for (let i = room.messages.length - 1; i >= 0; i--) {
            const m = room.messages[i];
            if (m.type === 'voice' && m.voiceExpiresAt && joinNow >= m.voiceExpiresAt) {
              m.isExpired = true;
              m.ciphertext = null;
              m.iv = null;
              if (room.voiceTimers.has(m.id)) {
                clearTimeout(room.voiceTimers.get(m.id));
                room.voiceTimers.delete(m.id);
              }
              room.messages.splice(i, 1);
              if (!room.deletedMessageIds) room.deletedMessageIds = new Set();
              room.deletedMessageIds.add(m.id);
            } else if (m.type === 'voice' && m.senderId !== clientId && !m.voiceExpiresAt && !m.isExpired && !m.isUnsent) {
              startVoiceUnreadTimer(room, m);
            } else if (m.type === 'photo' && m.photoExpiresAt && joinNow >= m.photoExpiresAt) {
              m.isExpired = true;
              m.ciphertext = null;
              m.iv = null;
              if (room.photoTimers.has(m.id)) {
                clearTimeout(room.photoTimers.get(m.id));
                room.photoTimers.delete(m.id);
              }
            }
          }

          // Sanitize recent envelopes (NEVER send ciphertext for expired or consumed photos)
          const sanitizedEnvelopes = room.messages
            .filter(m => !m.isUnsent && !room.deletedMessageIds?.has(m.id) && !(m.type === 'voice' && m.isExpired))
            .map(m => {
              if (m.type === 'photo' && (m.isExpired || m.photoOpened || !m.ciphertext)) {
                return { ...m, isExpired: true, ciphertext: null, iv: null };
              }
              return m;
            });

          // Register joining client identity if provided
          if (msg.identity && typeof msg.identity === 'object') {
            const displayName = typeof msg.identity.displayName === 'string'
              ? msg.identity.displayName.replace(/<[^>]*>/g, '').trim().slice(0, 24)
              : 'Anonymous';
            const avatar = typeof msg.identity.avatar === 'string' ? msg.identity.avatar.slice(0, 2000000) : 'neon-neko';
            const sanitized = { displayName, avatar };
            if (!room.identities) room.identities = new Map();
            room.identities.set(clientId, sanitized);
          }

          // Extract any identities already registered in the room
          const existingIdentities = {};
          if (room.identities) {
            for (const [pId, idObj] of room.identities.entries()) {
              if (pId !== clientId) existingIdentities[pId] = idObj;
            }
          }

          // Confirm join with rolling reconnect ticket and room chat-cleared state
          ws.send(JSON.stringify({
            type: 'joined',
            sessionId: cleanId,
            expiresAt: room.expiresAt,
            participantsCount: room.participants.size,
            peerLeftStatus: room.peerLeftStatus || null,
            reconnectTicket,
            recentEnvelopes: sanitizedEnvelopes,
            chatClearedAt: room.chatClearedAt || null,
            peerIdentities: existingIdentities
          }));

          // Notify peer and synchronize presence with identities
          for (const [pId, pWs] of room.participants.entries()) {
            if (pId !== clientId && pWs.readyState === WebSocket.OPEN) {
              const myIdentity = room.identities?.get(clientId);
              const peerIdentity = room.identities?.get(pId);
              pWs.send(JSON.stringify({
                type: 'peer_joined',
                participantsCount: room.participants.size,
                senderId: clientId,
                identity: myIdentity
              }));
              ws.send(JSON.stringify({
                type: 'peer_present',
                participantsCount: room.participants.size,
                senderId: pId,
                identity: peerIdentity
              }));
            }
          }
          break;
        }

        case 'ping': {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'pong' }));
          }
          break;
        }

        case 'identity': {
          if (!isAuthenticated || !currentSessionId) return;
          const room = rooms.get(currentSessionId);
          if (!room) return;

          const { identity } = msg;
          if (!identity || typeof identity !== 'object') return;

          const displayName = typeof identity.displayName === 'string'
            ? identity.displayName.replace(/<[^>]*>/g, '').trim().slice(0, 24)
            : 'Anonymous';
          const avatar = typeof identity.avatar === 'string' ? identity.avatar.slice(0, 2000000) : 'neon-neko';
          const sanitized = { displayName, avatar };

          if (!room.identities) room.identities = new Map();
          room.identities.set(currentClientId, sanitized);

          for (const [pId, pWs] of room.participants.entries()) {
            if (pId !== currentClientId && pWs.readyState === WebSocket.OPEN) {
              pWs.send(JSON.stringify({
                type: 'peer_identity',
                senderId: currentClientId,
                identity: sanitized
              }));
            }
          }
          break;
        }

        case 'message': {
          if (!isAuthenticated || !currentSessionId) return;
          const room = rooms.get(currentSessionId);
          if (!room) return;

          // Reject message if participant left or session has departed
          if (room.peerLeftStatus || (room.leftClientIds && room.leftClientIds.size > 0) || room.leftClientIds?.has(currentClientId)) {
            ws.send(JSON.stringify({
              type: 'error',
              code: 'SESSION_TERMINATED',
              message: 'User has left the session. No further messages can be sent.'
            }));
            return;
          }

          const { envelope } = msg;
          if (!envelope || typeof envelope !== 'object' || !envelope.id || !envelope.ciphertext || !envelope.iv) {
            return;
          }

          // Strict validation of envelope fields
          if (typeof envelope.id !== 'string' || envelope.id.length > 100) return;
          if (typeof envelope.ciphertext !== 'string' || envelope.ciphertext.length > 9000000) return;
          if (typeof envelope.iv !== 'string' || envelope.iv.length > 64) return;
          if (!['text', 'photo', 'voice'].includes(envelope.type)) return;

          const safeEnvelope = {
            id: envelope.id,
            senderId: currentClientId,
            type: envelope.type,
            timestamp: typeof envelope.timestamp === 'number' ? envelope.timestamp : Date.now(),
            iv: envelope.iv,
            ciphertext: envelope.ciphertext,
            replyTo: envelope.replyTo && typeof envelope.replyTo === 'object' ? {
              id: String(envelope.replyTo.id || ''),
              senderId: String(envelope.replyTo.senderId || ''),
              type: String(envelope.replyTo.type || 'text'),
              text: typeof envelope.replyTo.text === 'string' ? envelope.replyTo.text.slice(0, 200) : ''
            } : null,
            duration: typeof envelope.duration === 'number' ? envelope.duration : undefined,
            isViewOnce: Boolean(envelope.isViewOnce)
          };

          room.messages.push(safeEnvelope);
          if (room.messages.length > 100) {
            room.messages.shift();
          }

          let deliveredToPeer = false;
          for (const [pId, pWs] of room.participants.entries()) {
            if (pId !== currentClientId && pWs.readyState === WebSocket.OPEN) {
              pWs.send(JSON.stringify({
                type: 'message',
                envelope: safeEnvelope
              }));
              deliveredToPeer = true;
            }
          }

          ws.send(JSON.stringify({
            type: 'message_ack',
            id: safeEnvelope.id,
            timestamp: safeEnvelope.timestamp
          }));

          if (safeEnvelope.type === 'voice' && deliveredToPeer) {
            startVoiceUnreadTimer(room, safeEnvelope);
          }
          break;
        }

        case 'unsend': {
          if (!isAuthenticated || !currentSessionId) return;
          const room = rooms.get(currentSessionId);
          if (!room) return;

          const { messageId } = msg;
          if (!messageId || typeof messageId !== 'string') return;

          const targetIndex = room.messages.findIndex(m => m.id === messageId);
          if (targetIndex !== -1) {
            const targetMsg = room.messages[targetIndex];
            // Authoritative: Only the message sender can unsend
            if (targetMsg.senderId === currentClientId) {
              if (room.photoTimers.has(messageId)) {
                clearTimeout(room.photoTimers.get(messageId));
                room.photoTimers.delete(messageId);
              }
              if (room.voiceTimers.has(messageId)) {
                clearTimeout(room.voiceTimers.get(messageId));
                room.voiceTimers.delete(messageId);
              }

              room.messages.splice(targetIndex, 1);
              if (!room.deletedMessageIds) room.deletedMessageIds = new Set();
              room.deletedMessageIds.add(messageId);

              for (const pWs of room.participants.values()) {
                if (pWs.readyState === WebSocket.OPEN) {
                  pWs.send(JSON.stringify({
                    type: 'message_unsent',
                    messageId,
                    msgType: targetMsg.type
                  }));
                }
              }
            }
          }
          break;
        }

        case 'reaction': {
          if (!isAuthenticated || !currentSessionId) return;
          const room = rooms.get(currentSessionId);
          if (!room) return;

          const { messageId, emoji } = msg;
          if (!messageId || !emoji || typeof emoji !== 'string' || emoji.length > 32) return;

          const targetMsg = room.messages.find(m => m.id === messageId);
          if (targetMsg && !targetMsg.isUnsent && !targetMsg.isExpired) {
            targetMsg.reactions = applyUserReaction(targetMsg.reactions, currentClientId, emoji);

            for (const pWs of room.participants.values()) {
              if (pWs.readyState === WebSocket.OPEN) {
                pWs.send(JSON.stringify({
                  type: 'reaction',
                  messageId,
                  emoji,
                  senderId: currentClientId,
                  reactions: targetMsg.reactions
                }));
              }
            }
          }
          break;
        }

        // Photo opened: Starts strict 8-second countdown on first reveal
        case 'photo_opened': {
          if (!isAuthenticated || !currentSessionId) return;
          const room = rooms.get(currentSessionId);
          if (!room) return;

          const { messageId } = msg;
          if (!messageId || typeof messageId !== 'string') return;

          const targetMsg = room.messages.find(m => m.id === messageId);
          // Only recipient can trigger photo opened & timer, and only if not already expired/consumed
          if (targetMsg && targetMsg.type === 'photo' && targetMsg.senderId !== currentClientId && !targetMsg.isExpired && !targetMsg.isUnsent && targetMsg.ciphertext) {
            const seenTimestamp = Date.now();
            targetMsg.status = 'seen';
            targetMsg.seenAt = seenTimestamp;
            targetMsg.photoOpened = true;

            for (const [pId, pWs] of room.participants.entries()) {
              if (pWs.readyState === WebSocket.OPEN && pId !== currentClientId) {
                pWs.send(JSON.stringify({
                  type: 'seen',
                  messageId,
                  seenAt: seenTimestamp
                }));
              }
            }

            // Start 8-second countdown timer if not already running
            if (!room.photoTimers.has(messageId)) {
              const expiresAt = Date.now() + PHOTO_LIFETIME_MS;
              targetMsg.photoExpiresAt = expiresAt;

              for (const pWs of room.participants.values()) {
                if (pWs.readyState === WebSocket.OPEN) {
                  pWs.send(JSON.stringify({
                    type: 'photo_countdown_started',
                    messageId,
                    expiresAt
                  }));
                }
              }

              const timer = setTimeout(() => {
                targetMsg.isExpired = true;
                targetMsg.ciphertext = null; // Purge ciphertext from memory permanently
                targetMsg.iv = null;
                room.photoTimers.delete(messageId);

                for (const pWs of room.participants.values()) {
                  if (pWs.readyState === WebSocket.OPEN) {
                    pWs.send(JSON.stringify({
                      type: 'photo_expired',
                      messageId
                    }));
                  }
                }
              }, PHOTO_LIFETIME_MS);

              room.photoTimers.set(messageId, timer);
            }
          }
          break;
        }

        // Photo closed early: Immediately consumes one-view photo and purges payload
        case 'photo_closed':
        case 'photo_consumed': {
          if (!isAuthenticated || !currentSessionId) return;
          const room = rooms.get(currentSessionId);
          if (!room) return;

          const { messageId } = msg;
          if (!messageId || typeof messageId !== 'string') return;

          const targetMsg = room.messages.find(m => m.id === messageId);
          if (targetMsg && targetMsg.type === 'photo' && targetMsg.senderId !== currentClientId) {
            // Cancel any remaining 8s timer
            if (room.photoTimers.has(messageId)) {
              clearTimeout(room.photoTimers.get(messageId));
              room.photoTimers.delete(messageId);
            }

            // Immediately mark permanently expired and purge ciphertext
            targetMsg.isExpired = true;
            targetMsg.ciphertext = null;
            targetMsg.iv = null;
            targetMsg.photoOpened = true;

            for (const pWs of room.participants.values()) {
              if (pWs.readyState === WebSocket.OPEN) {
                pWs.send(JSON.stringify({
                  type: 'photo_expired',
                  messageId
                }));
              }
            }
          }
          break;
        }

        case 'typing': {
          if (!isAuthenticated || !currentSessionId) return;
          const room = rooms.get(currentSessionId);
          if (!room) return;

          const isTyping = Boolean(msg.isTyping);
          for (const [pId, pWs] of room.participants.entries()) {
            if (pId !== currentClientId && pWs.readyState === WebSocket.OPEN) {
              pWs.send(JSON.stringify({
                type: 'typing',
                isTyping
              }));
            }
          }
          break;
        }

        case 'delivered':
        case 'message:delivered': {
          if (!isAuthenticated || !currentSessionId) return;
          const room = rooms.get(currentSessionId);
          if (!room) return;

          const { messageId } = msg;
          if (!messageId || typeof messageId !== 'string') return;

          const targetMsg = room.messages.find(m => m.id === messageId);
          if (targetMsg && targetMsg.senderId !== currentClientId && targetMsg.status !== 'seen') {
            targetMsg.status = 'delivered';
          }

          if (targetMsg && targetMsg.type === 'voice' && !targetMsg.voiceExpiresAt && !targetMsg.isExpired && !targetMsg.isUnsent) {
            startVoiceUnreadTimer(room, targetMsg);
          }

          for (const [pId, pWs] of room.participants.entries()) {
            if (pId !== currentClientId && pWs.readyState === WebSocket.OPEN) {
              pWs.send(JSON.stringify({
                type: 'delivered',
                messageId
              }));
            }
          }
          break;
        }

        case 'seen':
        case 'message:read': {
          if (!isAuthenticated || !currentSessionId) return;
          const room = rooms.get(currentSessionId);
          if (!room) return;

          const { messageId, seenAt } = msg;
          if (!messageId || typeof messageId !== 'string') return;

          const readTimestamp = typeof seenAt === 'number' ? seenAt : Date.now();
          const targetMsg = room.messages.find(m => m.id === messageId);
          if (targetMsg && targetMsg.senderId !== currentClientId) {
            targetMsg.status = 'seen';
            targetMsg.seenAt = readTimestamp;
          }

          for (const [pId, pWs] of room.participants.entries()) {
            if (pId !== currentClientId && pWs.readyState === WebSocket.OPEN) {
              pWs.send(JSON.stringify({
                type: 'seen',
                messageId,
                seenAt: readTimestamp
              }));
            }
          }
          break;
        }

        case 'voice_note_ended': {
          if (!isAuthenticated || !currentSessionId) return;
          const room = rooms.get(currentSessionId);
          if (!room) return;

          const { messageId } = msg;
          if (!messageId || typeof messageId !== 'string') return;

          const targetMsg = room.messages.find(m => m.id === messageId);
          if (targetMsg && targetMsg.type === 'voice' && targetMsg.senderId !== currentClientId && !targetMsg.isExpired && !targetMsg.isUnsent) {
            if (targetMsg.voiceTimerType === 'listened') return;

            if (room.voiceTimers.has(messageId)) {
              clearTimeout(room.voiceTimers.get(messageId));
              room.voiceTimers.delete(messageId);
            }

            const expiresAt = Date.now() + VOICE_NOTE_LISTENED_LIFETIME_MS;
            targetMsg.voiceTimerType = 'listened';
            targetMsg.voiceExpiresAt = expiresAt;
            targetMsg.voiceEnded = true;

            for (const pWs of room.participants.values()) {
              if (pWs.readyState === WebSocket.OPEN) {
                pWs.send(JSON.stringify({
                  type: 'voice_countdown_started',
                  messageId,
                  timerType: 'listened',
                  expiresAt
                }));
              }
            }

            const timer = setTimeout(() => {
              targetMsg.isExpired = true;
              targetMsg.ciphertext = null;
              targetMsg.iv = null;
              room.voiceTimers.delete(messageId);

              const idx = room.messages.findIndex(m => m.id === messageId);
              if (idx !== -1) room.messages.splice(idx, 1);
              if (!room.deletedMessageIds) room.deletedMessageIds = new Set();
              room.deletedMessageIds.add(messageId);

              for (const pWs of room.participants.values()) {
                if (pWs.readyState === WebSocket.OPEN) {
                  pWs.send(JSON.stringify({
                    type: 'voice_expired',
                    messageId
                  }));
                }
              }
            }, VOICE_NOTE_LISTENED_LIFETIME_MS);

            room.voiceTimers.set(messageId, timer);
          }
          break;
        }

        case 'leave_session': {
          if (!isAuthenticated || !currentSessionId) return;
          const room = rooms.get(currentSessionId);
          if (room) {
            ws.isIntentionalLeave = true;
            if (room.disconnectTimers?.has(currentClientId)) {
              clearTimeout(room.disconnectTimers.get(currentClientId));
              room.disconnectTimers.delete(currentClientId);
            }

            room.participants.delete(currentClientId);
            if (!room.leftClientIds) room.leftClientIds = new Set();
            room.leftClientIds.add(currentClientId);

            // Deduplicate: Only set peerLeftStatus and broadcast if not already set
            if (!room.peerLeftStatus) {
              const leaveTimestamp = Date.now();
              room.peerLeftStatus = {
                text: 'User left the session',
                timestamp: leaveTimestamp,
                departedClientId: currentClientId
              };

              for (const pWs of room.participants.values()) {
                if (pWs.readyState === WebSocket.OPEN) {
                  pWs.send(JSON.stringify({
                    type: 'peer_left_permanent',
                    text: 'User left the session',
                    timestamp: leaveTimestamp
                  }));
                }
              }
            }
          }
          break;
        }

        case 'clear_chat': {
          if (!isAuthenticated || !currentSessionId) return;
          const room = rooms.get(currentSessionId);
          if (room) {
            room.chatClearedAt = Date.now();
            for (const timer of room.photoTimers.values()) clearTimeout(timer);
            room.photoTimers.clear();
            for (const timer of room.voiceTimers.values()) clearTimeout(timer);
            room.voiceTimers.clear();
            room.messages = [];
            for (const pWs of room.participants.values()) {
              if (pWs.readyState === WebSocket.OPEN) {
                pWs.send(JSON.stringify({ type: 'chat_cleared' }));
              }
            }
          }
          break;
        }

        case 'burn_session': {
          if (!isAuthenticated || !currentSessionId) return;
          const room = rooms.get(currentSessionId);
          if (room) {
            room.burned = true;
            for (const timer of room.photoTimers.values()) clearTimeout(timer);
            room.photoTimers.clear();
            for (const timer of room.voiceTimers.values()) clearTimeout(timer);
            room.voiceTimers.clear();
            if (room.disconnectTimers) {
              for (const timer of room.disconnectTimers.values()) clearTimeout(timer);
              room.disconnectTimers.clear();
            }

            for (const pWs of room.participants.values()) {
              if (pWs.readyState === WebSocket.OPEN) {
                pWs.send(JSON.stringify({ type: 'session_burned' }));
              }
            }
            if (room.joinToken) {
              joinTokens.delete(room.joinToken);
              usedTokens.delete(room.joinToken);
            }
            if (room.identities) {
              room.identities.clear();
            }
            rooms.delete(currentSessionId);
          }
          break;
        }

        default:
          break;
      }
    } catch {
      // Ignore malformed payloads safely
    }
  });

  ws.on('close', (code) => {
    // Remove from IP tracking
    const conns = ipWsConnections.get(clientIp);
    if (conns) {
      conns.delete(ws);
      if (conns.size === 0) ipWsConnections.delete(clientIp);
    }

    // If this socket was superseded by a newer connection from the same client, ignore
    if (ws.isReplaced) {
      return;
    }

    if (currentSessionId && currentClientId) {
      const room = rooms.get(currentSessionId);
      if (room) {
        // Only delete participant and notify if this closing socket is the ACTIVE one
        if (room.participants.get(currentClientId) !== ws) {
          return;
        }

        room.participants.delete(currentClientId);

        if (!room.leftClientIds) room.leftClientIds = new Set();

        const isTwoParticipantSession = room.hadTwoParticipants || room.participantHistory?.size >= 2;

        if (isTwoParticipantSession) {
          const isIntentional = ws.isIntentionalLeave || code === 1001;

          if (isIntentional) {
            // Actual page reload, tab close, or intentional leave:
            // Clear any pending disconnect timer for this client
            if (room.disconnectTimers?.has(currentClientId)) {
              clearTimeout(room.disconnectTimers.get(currentClientId));
              room.disconnectTimers.delete(currentClientId);
            }

            // If departure has not been marked yet, this participant disconnecting is the authoritative departure
            if (!room.peerLeftStatus) {
              room.leftClientIds.add(currentClientId);
              const leaveTimestamp = Date.now();
              room.peerLeftStatus = {
                text: 'User left the session',
                timestamp: leaveTimestamp,
                departedClientId: currentClientId
              };

              // Authoritatively notify remaining participants of permanent departure immediately
              for (const pWs of room.participants.values()) {
                if (pWs.readyState === WebSocket.OPEN) {
                  pWs.send(JSON.stringify({
                    type: 'peer_left_permanent',
                    text: 'User left the session',
                    timestamp: leaveTimestamp
                  }));
                }
              }
            }
          } else {
            // Temporary network interruption (e.g. Wi-Fi drop, brief TCP reset):
            // Allow 30-second reconnection grace period without immediate permanent departure
            if (!room.peerLeftStatus && !room.leftClientIds.has(currentClientId)) {
              if (room.disconnectTimers?.has(currentClientId)) {
                clearTimeout(room.disconnectTimers.get(currentClientId));
              }

              const timer = setTimeout(() => {
                room.disconnectTimers.delete(currentClientId);
                // Grace period elapsed without reconnection: authoritatively mark permanent departure
                if (!room.peerLeftStatus && !room.leftClientIds.has(currentClientId)) {
                  room.leftClientIds.add(currentClientId);
                  const leaveTimestamp = Date.now();
                  room.peerLeftStatus = {
                    text: 'User left the session',
                    timestamp: leaveTimestamp,
                    departedClientId: currentClientId
                  };

                  for (const pWs of room.participants.values()) {
                    if (pWs.readyState === WebSocket.OPEN) {
                      pWs.send(JSON.stringify({
                        type: 'peer_left_permanent',
                        text: 'User left the session',
                        timestamp: leaveTimestamp
                      }));
                    }
                  }
                }
              }, RECONNECT_GRACE_PERIOD_MS);

              room.disconnectTimers.set(currentClientId, timer);

              // Notify remaining participants of temporary disconnect (presence offline/waiting)
              for (const pWs of room.participants.values()) {
                if (pWs.readyState === WebSocket.OPEN) {
                  pWs.send(JSON.stringify({
                    type: 'peer_left',
                    participantsCount: room.participants.size,
                    temporary: true,
                    gracePeriodMs: RECONNECT_GRACE_PERIOD_MS
                  }));
                }
              }
            }
          }
        } else {
          // Creator waiting alone or 1 participant before peer joined
          for (const pWs of room.participants.values()) {
            if (pWs.readyState === WebSocket.OPEN) {
              pWs.send(JSON.stringify({
                type: 'peer_left',
                participantsCount: room.participants.size
              }));
            }
          }
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`U2U Server running on port ${PORT}`);
});
