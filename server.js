import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { applyUserReaction } from './src/utils/reactions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(express.json({ limit: '15mb' }));

// In-memory store: Zero-knowledge, strictly ephemeral rooms
// Map<sessionId, {
//   id: string,
//   passcodeHash: string,
//   createdAt: number,
//   expiresAt: number,
//   burned: boolean,
//   participants: Map<clientId, ws>,
//   messages: Array<envelope>,
//   photoTimers: Map<messageId, NodeJS.Timeout>
// }>
const rooms = new Map();

// One-time authentication tickets for WebSocket handshake (TTL: 60s)
// Map<ticketId, { sessionId, clientId, expiresAt }>
const authTickets = new Map();

// Rate limiting & Brute force protection
// Map<ipOrKey, { count: number, resetAt: number, lockedUntil: number }>
const attemptTracker = new Map();

// Secure Join Token mappings
// Map<joinToken, sessionId>
const joinTokens = new Map();
// Map<joinToken, sessionId> for consumed tokens
const usedTokens = new Map();

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const PHOTO_LIFETIME_MS = 30 * 1000; // 30 seconds after opening
const VOICE_NOTE_UNLISTENED_LIFETIME_MS = 180 * 1000; // 180 seconds (3 minutes) from receipt if unplayed
const VOICE_NOTE_LISTENED_LIFETIME_MS = 60 * 1000; // 60 seconds after recipient fully plays it

// Helper: Start authoritative 180-second unread/listen countdown for a voice note
function startVoiceUnreadTimer(room, targetMsg) {
  if (!room || !targetMsg || targetMsg.type !== 'voice') return;
  if (targetMsg.isExpired || targetMsg.isUnsent) return;
  // If timer is already running or already listened, don't restart
  if (targetMsg.voiceExpiresAt || room.voiceTimers.has(targetMsg.id)) return;

  const messageId = targetMsg.id;
  const expiresAt = Date.now() + VOICE_NOTE_UNLISTENED_LIFETIME_MS;
  targetMsg.voiceTimerType = 'unread';
  targetMsg.voiceExpiresAt = expiresAt;

  // Broadcast to all participants that 180s countdown has started
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

  // Schedule deletion at 180 seconds if never listened to
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

// Helper: Rate Limiting
function checkRateLimit(key) {
  const now = Date.now();
  const record = attemptTracker.get(key);

  if (record) {
    if (record.lockedUntil && now < record.lockedUntil) {
      const waitSeconds = Math.ceil((record.lockedUntil - now) / 1000);
      return { allowed: false, waitSeconds };
    }

    if (now > record.resetAt) {
      attemptTracker.delete(key);
    }
  }
  return { allowed: true };
}

function recordFailedAttempt(key) {
  const now = Date.now();
  let record = attemptTracker.get(key);

  if (!record || now > record.resetAt) {
    record = { count: 1, resetAt: now + 10 * 60 * 1000, lockedUntil: 0 };
  } else {
    record.count += 1;
    if (record.count >= 5) {
      // Lock out for 10 minutes after 5 consecutive failures
      record.lockedUntil = now + 10 * 60 * 1000;
    }
  }
  attemptTracker.set(key, record);
}

function clearFailedAttempts(key) {
  attemptTracker.delete(key);
}

// Cleanup expired sessions & auth tickets every minute
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
      // Clear all photo timers
      for (const timer of room.photoTimers.values()) {
        clearTimeout(timer);
      }
      // Clear all voice note timers
      for (const timer of room.voiceTimers.values()) {
        clearTimeout(timer);
      }
      // Clear all disconnect timers
      if (room.disconnectTimers) {
        for (const timer of room.disconnectTimers.values()) {
          clearTimeout(timer);
        }
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
}, 30 * 1000);

// API 1: Create Session (Authoritative Session Creation)
app.post('/api/session/create', (req, res) => {
  const { sessionId, passcodeHash, passcode } = req.body;
  if (!sessionId || !passcodeHash) {
    return res.status(400).json({ error: 'Session ID and Passcode hash are required' });
  }

  const cleanSessionId = sessionId.trim().toUpperCase();

  // Check if room already exists
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
    passcode: passcode || '',
    joinToken,
    joinTokenUsed: false,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
    burned: false,
    participants: new Map(),
    messages: [],
    photoTimers: new Map(),
    voiceTimers: new Map(),
    disconnectTimers: new Map(),
    peerLeftStatus: null,
    leftClientIds: new Set()
  };

  rooms.set(cleanSessionId, room);
  joinTokens.set(joinToken, cleanSessionId);

  // Issue creator ticket
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
app.post('/api/session/auth', (req, res) => {
  const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const { sessionId, passcodeHash, clientId } = req.body;

  if (!sessionId || !passcodeHash) {
    return res.status(400).json({ error: 'Session ID and Passcode are required' });
  }

  const cleanSessionId = sessionId.trim().toUpperCase();
  const rateLimitKey = `${clientIp}:${cleanSessionId}`;

  // Check rate limit
  const rateCheck = checkRateLimit(rateLimitKey);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      error: `Too many failed attempts. Please wait ${rateCheck.waitSeconds}s before trying again.`
    });
  }

  const room = rooms.get(cleanSessionId);
  const now = Date.now();

  // Failure Case 1: Room does not exist, is expired, or was burned
  if (!room || room.burned || now >= room.expiresAt) {
    recordFailedAttempt(rateLimitKey);
    return res.status(401).json({
      error: "We couldn't verify this session. Check the Session ID and passcode and try again."
    });
  }

  // Failure Case 2: Passcode hash mismatch
  if (room.passcodeHash !== passcodeHash) {
    recordFailedAttempt(rateLimitKey);
    return res.status(401).json({
      error: "We couldn't verify this session. Check the Session ID and passcode and try again."
    });
  }

  // Failure Case 3: Participant limit reached (max 2 people)
  const isReconnecting = clientId && room.participants.has(clientId);
  if (!isReconnecting && room.participants.size >= 2) {
    return res.status(403).json({
      error: 'This session is full. Exactly two participants are permitted.'
    });
  }

  // If second participant joins via manual ID + Passcode, invalidate join token
  if (!isReconnecting && room.participants.size === 1) {
    room.joinTokenUsed = true;
    if (room.joinToken) {
      joinTokens.delete(room.joinToken);
      usedTokens.set(room.joinToken, cleanSessionId);
    }
  }

  // Authentication succeeded: clear failed attempts
  clearFailedAttempts(rateLimitKey);

  // Generate one-time WebSocket connection ticket
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

// API 3: Verify Join Token Status
app.get('/api/session/join/:token', (req, res) => {
  const { token } = req.params;
  const now = Date.now();

  // If token is already used
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

  // If token is not recognized
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

// API 4: Claim Join Token & Authenticate
app.post('/api/session/join/:token', (req, res) => {
  const { token } = req.params;
  const { clientId } = req.body;
  const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const now = Date.now();

  const rateLimitKey = `${clientIp}:join-link`;
  const rateCheck = checkRateLimit(rateLimitKey);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      error: 'RATE_LIMITED',
      message: `Too many attempts. Please wait ${rateCheck.waitSeconds}s.`
    });
  }

  // Check if token was already consumed
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
    recordFailedAttempt(rateLimitKey);
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

  // Authoritatively consume the join token immediately
  room.joinTokenUsed = true;
  joinTokens.delete(token);
  usedTokens.set(token, room.id);
  clearFailedAttempts(rateLimitKey);

  // Issue one-time ticket
  const ticket = crypto.randomBytes(24).toString('hex');
  authTickets.set(ticket, {
    sessionId: room.id,
    clientId,
    expiresAt: now + 60 * 1000
  });

  return res.json({
    success: true,
    sessionId: room.id,
    passcode: room.passcode,
    expiresAt: room.expiresAt,
    ticket
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', activeSessions: rooms.size });
});

// Serve frontend build in production
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));
app.use((req, res) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/ws')) return;
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) res.status(200).send('U2U Server running');
  });
});

// WebSocket Connection Handling with Strict Authenticated Tickets
wss.on('connection', (ws) => {
  let currentSessionId = null;
  let currentClientId = null;
  let isAuthenticated = false;

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());

      switch (msg.type) {
        case 'join': {
          const { sessionId, ticket, clientId } = msg;

          if (!sessionId || !ticket || !clientId) {
            ws.send(JSON.stringify({
              type: 'error',
              code: 'UNAUTHORIZED',
              message: "We couldn't verify this session."
            }));
            ws.close();
            return;
          }

          const cleanId = sessionId.trim().toUpperCase();

          // Validate one-time ticket
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

          // Consume ticket (one-time use)
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

          // Check participant limit
          const isReconnecting = room.participants.has(clientId);
          if (!isReconnecting && room.participants.size >= 2) {
            ws.send(JSON.stringify({
              type: 'error',
              code: 'ROOM_FULL',
              message: 'This session is full. Exactly two participants are permitted.'
            }));
            ws.close();
            return;
          }

          // Mark authenticated
          isAuthenticated = true;
          currentSessionId = cleanId;
          currentClientId = clientId;

          // If this client had a pending disconnect timer, cancel it (client reconnected)
          if (room.disconnectTimers?.has(clientId)) {
            clearTimeout(room.disconnectTimers.get(clientId));
            room.disconnectTimers.delete(clientId);
          }

          // Register client
          room.participants.set(clientId, ws);

          // Check for any expired voice messages or newly received voice notes
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
              // Recipient just received this unread voice note: start 180s timer immediately
              startVoiceUnreadTimer(room, m);
            }
          }

          // Confirm join
          ws.send(JSON.stringify({
            type: 'joined',
            sessionId: cleanId,
            expiresAt: room.expiresAt,
            participantsCount: room.participants.size,
            peerLeftStatus: room.peerLeftStatus || null,
            recentEnvelopes: room.messages.filter(m => !m.isUnsent && !room.deletedMessageIds?.has(m.id) && !(m.type === 'voice' && m.isExpired))
          }));

          // Notify peer if present
          for (const [pId, pWs] of room.participants.entries()) {
            if (pId !== clientId && pWs.readyState === WebSocket.OPEN) {
              pWs.send(JSON.stringify({
                type: 'peer_joined',
                participantsCount: room.participants.size
              }));
              ws.send(JSON.stringify({
                type: 'peer_present',
                participantsCount: room.participants.size
              }));
            }
          }
          break;
        }

        case 'message': {
          if (!isAuthenticated) return;
          const { sessionId, envelope } = msg;
          const room = rooms.get(sessionId);
          if (!room || !envelope) return;

          // Store envelope in ephemeral buffer (max 100 items)
          room.messages.push(envelope);
          if (room.messages.length > 100) {
            room.messages.shift();
          }

          let deliveredToPeer = false;
          // Relay directly to other participant
          for (const [pId, pWs] of room.participants.entries()) {
            if (pId !== envelope.senderId && pWs.readyState === WebSocket.OPEN) {
              pWs.send(JSON.stringify({
                type: 'message',
                envelope
              }));
              deliveredToPeer = true;
            }
          }

          // Acknowledge receipt to sender
          ws.send(JSON.stringify({
            type: 'message_ack',
            id: envelope.id,
            timestamp: envelope.timestamp
          }));

          // If voice note was received by recipient, start 180s unread/listen countdown immediately
          if (envelope.type === 'voice' && deliveredToPeer) {
            startVoiceUnreadTimer(room, envelope);
          }
          break;
        }

        // Unsend Message (Text or Photo)
        case 'unsend': {
          if (!isAuthenticated) return;
          const { sessionId, messageId, senderId } = msg;
          const room = rooms.get(sessionId);
          if (!room) return;

          // Find message in ephemeral store
          const targetIndex = room.messages.findIndex(m => m.id === messageId);
          if (targetIndex !== -1) {
            const targetMsg = room.messages[targetIndex];
            // Only sender can unsend
            if (targetMsg.senderId === senderId) {
              // If photo, clear any running photo timer
              if (room.photoTimers.has(messageId)) {
                clearTimeout(room.photoTimers.get(messageId));
                room.photoTimers.delete(messageId);
              }
              // If voice, clear any running voice timer
              if (room.voiceTimers.has(messageId)) {
                clearTimeout(room.voiceTimers.get(messageId));
                room.voiceTimers.delete(messageId);
              }

              // Completely remove message from room.messages store
              room.messages.splice(targetIndex, 1);
              if (!room.deletedMessageIds) room.deletedMessageIds = new Set();
              room.deletedMessageIds.add(messageId);

              // Broadcast unsend to both participants
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

        // Message Reaction (Add/Toggle reaction on a message)
        case 'reaction': {
          if (!isAuthenticated) return;
          const { sessionId, messageId, emoji, senderId } = msg;
          const room = rooms.get(sessionId);
          if (!room || !messageId || !emoji) return;

          const targetMsg = room.messages.find(m => m.id === messageId);
          if (targetMsg && !targetMsg.isUnsent && !targetMsg.isExpired) {
            targetMsg.reactions = applyUserReaction(targetMsg.reactions, senderId, emoji);

            for (const pWs of room.participants.values()) {
              if (pWs.readyState === WebSocket.OPEN) {
                pWs.send(JSON.stringify({
                  type: 'reaction',
                  messageId,
                  emoji,
                  senderId,
                  reactions: targetMsg.reactions
                }));
              }
            }
          }
          break;
        }

        // Photo Opened: Start authoritative 30-second countdown and mark photo seen
        case 'photo_opened': {
          if (!isAuthenticated) return;
          const { sessionId, messageId, senderId } = msg;
          const room = rooms.get(sessionId);
          if (!room) return;

          const targetMsg = room.messages.find(m => m.id === messageId);
          if (targetMsg && targetMsg.type === 'photo' && !targetMsg.isExpired && !targetMsg.isUnsent) {
            const seenTimestamp = Date.now();
            targetMsg.status = 'seen';
            targetMsg.seenAt = seenTimestamp;
            targetMsg.photoOpened = true;

            // Notify peer of seen status
            for (const [pId, pWs] of room.participants.entries()) {
              if (pWs.readyState === WebSocket.OPEN && pId !== senderId) {
                pWs.send(JSON.stringify({
                  type: 'seen',
                  messageId,
                  seenAt: seenTimestamp
                }));
              }
            }

            // Check if timer already started
            if (!room.photoTimers.has(messageId)) {
              const expiresAt = Date.now() + PHOTO_LIFETIME_MS;
              targetMsg.photoExpiresAt = expiresAt;

              // Notify both participants that 30-second countdown started
              for (const pWs of room.participants.values()) {
                if (pWs.readyState === WebSocket.OPEN) {
                  pWs.send(JSON.stringify({
                    type: 'photo_countdown_started',
                    messageId,
                    expiresAt
                  }));
                }
              }

              // Schedule deletion at 30 seconds
              const timer = setTimeout(() => {
                targetMsg.isExpired = true;
                targetMsg.ciphertext = null; // Purge encrypted server data
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

        // Typing indicator
        case 'typing': {
          if (!isAuthenticated) return;
          const { sessionId, isTyping, senderId } = msg;
          const room = rooms.get(sessionId);
          if (!room) return;

          for (const [pId, pWs] of room.participants.entries()) {
            if (pId !== senderId && pWs.readyState === WebSocket.OPEN) {
              pWs.send(JSON.stringify({
                type: 'typing',
                isTyping
              }));
            }
          }
          break;
        }

        // Delivered and Seen receipts (with aliases and state persistence)
        case 'delivered':
        case 'message:delivered': {
          if (!isAuthenticated) return;
          const { sessionId, messageId, senderId } = msg;
          const room = rooms.get(sessionId);
          if (!room) return;

          const targetMsg = room.messages.find(m => m.id === messageId);
          if (targetMsg && targetMsg.status !== 'seen') {
            targetMsg.status = 'delivered';
          }

          // If voice note was delivered and 180s unread timer not yet started, start it
          if (targetMsg && targetMsg.type === 'voice' && !targetMsg.voiceExpiresAt && !targetMsg.isExpired && !targetMsg.isUnsent) {
            startVoiceUnreadTimer(room, targetMsg);
          }

          for (const [pId, pWs] of room.participants.entries()) {
            if (pId !== senderId && pWs.readyState === WebSocket.OPEN) {
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
          if (!isAuthenticated) return;
          const { sessionId, messageId, senderId, seenAt } = msg;
          const room = rooms.get(sessionId);
          if (!room) return;

          const readTimestamp = seenAt || Date.now();
          const targetMsg = room.messages.find(m => m.id === messageId);
          if (targetMsg) {
            targetMsg.status = 'seen';
            targetMsg.seenAt = readTimestamp;
          }

          for (const [pId, pWs] of room.participants.entries()) {
            if (pId !== senderId && pWs.readyState === WebSocket.OPEN) {
              pWs.send(JSON.stringify({
                type: 'seen',
                messageId,
                seenAt: readTimestamp
              }));
            }
          }
          break;
        }

        // Explicit user leaves session
        case 'leave_session': {
          if (!isAuthenticated) return;
          const { sessionId, clientId } = msg;
          const room = rooms.get(sessionId);
          if (room) {
            // Cancel any pending disconnect timer for this client
            if (room.disconnectTimers?.has(clientId)) {
              clearTimeout(room.disconnectTimers.get(clientId));
              room.disconnectTimers.delete(clientId);
            }

            room.participants.delete(clientId);
            if (!room.leftClientIds) room.leftClientIds = new Set();
            room.leftClientIds.add(clientId);

            const leaveTimestamp = Date.now();
            room.peerLeftStatus = {
              text: 'User left the session',
              timestamp: leaveTimestamp
            };

            // Notify remaining participant(s) with permanent leave status
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
          break;
        }

        // Clear chat
        case 'clear_chat': {
          if (!isAuthenticated) return;
          const { sessionId } = msg;
          const room = rooms.get(sessionId);
          if (room) {
            // Cancel photo timers
            for (const timer of room.photoTimers.values()) {
              clearTimeout(timer);
            }
            room.photoTimers.clear();
            // Cancel voice note timers
            for (const timer of room.voiceTimers.values()) {
              clearTimeout(timer);
            }
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

        // Voice note ended (recipient finished full playback) — cancel 180s timer and start 60s deletion timer
        case 'voice_note_ended': {
          if (!isAuthenticated) return;
          const { sessionId, messageId, senderId } = msg;
          const room = rooms.get(sessionId);
          if (!room) return;

          const targetMsg = room.messages.find(m => m.id === messageId);
          if (targetMsg && targetMsg.type === 'voice' && !targetMsg.isExpired && !targetMsg.isUnsent) {
            // Idempotent: don't restart 60s timer if already in 'listened' state
            if (targetMsg.voiceTimerType === 'listened') return;

            // Stop/cancel the 180-second timer immediately
            if (room.voiceTimers.has(messageId)) {
              clearTimeout(room.voiceTimers.get(messageId));
              room.voiceTimers.delete(messageId);
            }

            // Start NEW 60-second deletion timer
            const expiresAt = Date.now() + VOICE_NOTE_LISTENED_LIFETIME_MS;
            targetMsg.voiceTimerType = 'listened';
            targetMsg.voiceExpiresAt = expiresAt;
            targetMsg.voiceEnded = true;

            // Notify both participants that 60s countdown has started
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

            // Schedule deletion at 60 seconds
            const timer = setTimeout(() => {
              targetMsg.isExpired = true;
              // Purge the encrypted audio payload immediately
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

        // Burn session (Complete Destruction)
        case 'burn_session': {
          if (!isAuthenticated) return;
          const { sessionId } = msg;
          const room = rooms.get(sessionId);
          if (room) {
            room.burned = true;
            for (const timer of room.photoTimers.values()) {
              clearTimeout(timer);
            }
            room.photoTimers.clear();
            // Cancel voice note timers
            for (const timer of room.voiceTimers.values()) {
              clearTimeout(timer);
            }
            room.voiceTimers.clear();
            // Cancel disconnect timers
            if (room.disconnectTimers) {
              for (const timer of room.disconnectTimers.values()) {
                clearTimeout(timer);
              }
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
            rooms.delete(sessionId);
          }
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.error('WebSocket message parsing error:', err);
    }
  });

  ws.on('close', () => {
    if (currentSessionId && currentClientId) {
      const room = rooms.get(currentSessionId);
      if (room) {
        room.participants.delete(currentClientId);
        // Inform remaining participant of peer disconnect
        for (const pWs of room.participants.values()) {
          if (pWs.readyState === WebSocket.OPEN) {
            pWs.send(JSON.stringify({
              type: 'peer_left',
              participantsCount: room.participants.size
            }));
          }
        }

        // Only start disconnect grace period if client hasn't already left permanently
        // and there is still an active participant in the room
        if (!room.burned && !room.leftClientIds?.has(currentClientId) && !room.peerLeftStatus && room.participants.size > 0) {
          if (!room.disconnectTimers) room.disconnectTimers = new Map();
          if (room.disconnectTimers.has(currentClientId)) {
            clearTimeout(room.disconnectTimers.get(currentClientId));
          }

          const leavingClientId = currentClientId;
          const timer = setTimeout(() => {
            room.disconnectTimers?.delete(leavingClientId);
            if (!room.burned && !room.participants.has(leavingClientId) && !room.peerLeftStatus && room.participants.size > 0) {
              if (!room.leftClientIds) room.leftClientIds = new Set();
              room.leftClientIds.add(leavingClientId);

              const leaveTimestamp = Date.now();
              room.peerLeftStatus = {
                text: 'User left the session',
                timestamp: leaveTimestamp
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
          }, 5000); // 5-second grace window to distinguish momentary network drop from permanent departure

          room.disconnectTimers.set(currentClientId, timer);
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`U2U Server running on port ${PORT}`);
});
