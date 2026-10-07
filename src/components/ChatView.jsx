import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus, ArrowUp, Image as ImageIcon,
  AlertCircle, ChevronDown, Mic, WifiOff,
  MoreHorizontal, Smile
} from 'lucide-react';
import { encryptPayload, decryptPayload, compressImage } from '../utils/crypto';
import {
  playSentSound,
  playReceivedSound,
  playBurnSound,
  playTickSound,
  playDeliveredSound,
  playSeenSound,
  playVoiceNoteSentSound,
  playVoiceNoteReceivedSound,
  playImageReceivedSound,
  playViewOnceOpenedSound,
  playImageExpiredSound,
  playUnsentSound,
  playUserJoinedSound,
  playUserLeftSound,
  playErrorSound
} from '../utils/audio';
import { formatContextualTime, formatFullTime } from '../utils/time';
import PhotoPreviewModal from './modals/PhotoPreviewModal';
import ImageViewerModal from './modals/ImageViewerModal';
import SecurityModal from './modals/SecurityModal';
import ClearChatModal from './modals/ClearChatModal';
import BurnSessionModal from './modals/BurnSessionModal';
import LeaveSessionModal from './modals/LeaveSessionModal';
import MessageActionModal from './modals/MessageActionModal';
import MessageStatus from './MessageStatus';
import PhotoBubble from './PhotoBubble';
import { VoiceRecorder, VoiceNoteBubble } from './VoiceNoteBubble';
import MessageMenu from './menus/MessageMenu';
import MessageReactions from './reactions/MessageReactions';
import EmojiPickerModal from './emojis/EmojiPickerModal';
import { renderMessageContent } from './emojis/U2UEmoji';
import { ComposerReplyBar, MessageReplyQuote } from './ReplyPreview';
import { applyUserReaction } from '../utils/reactions';

// One-way state machine progression ranks
const STATUS_RANK = {
  sending: 0,
  sent: 1,
  delivered: 2,
  seen: 3,
};

function updateMessageStatus(msg, newStatus, extra = {}) {
  const currentRank = STATUS_RANK[msg.status] || 0;
  const newRank = STATUS_RANK[newStatus] || 0;
  if (newRank >= currentRank) {
    return { ...msg, status: newStatus, ...extra };
  }
  return { ...msg, ...extra };
}

export default function ChatView({
  sessionId, passcode, cryptoKey, clientId, authTicket,
  onLeave, onSessionBurned, onSessionExpired, onToast,
  securityModalOpen, setSecurityModalOpen,
  clearChatModalOpen, setClearChatModalOpen,
  burnSessionModalOpen, setBurnSessionModalOpen,
  leaveModalOpen, setLeaveModalOpen,
}) {
  const [messages, setMessages] = useState([]);
  const [systemMessages, setSystemMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [peerPresent, setPeerPresent] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [activeViewerMsg, setActiveViewerMsg] = useState(null);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [burningTransition, setBurningTransition] = useState(false);
  const [newMsgCount, setNewMsgCount] = useState(0);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [actionTarget, setActionTarget] = useState(null);
  const [tooltipMsgId, setTooltipMsgId] = useState(null);
  const [photoTimers, setPhotoTimers] = useState({}); // messageId -> { expiresAt, secondsLeft }
  const [voiceTimers, setVoiceTimers] = useState({}); // messageId -> { expiresAt, secondsLeft }
  const [isRecording, setIsRecording] = useState(false);
  const [activeMenuMsgId, setActiveMenuMsgId] = useState(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [reactionPickerTarget, setReactionPickerTarget] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);

  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const attachmentMenuRef = useRef(null);
  const viewportRef = useRef(null);
  const longPressTimerRef = useRef(null);
  // IntersectionObserver for real per-message seen tracking
  const intersectionObserverRef = useRef(null);
  // Track message IDs we've already sent a 'seen' ack for (idempotency)
  const seenMessageIdsRef = useRef(new Set());
  // Ref to always have the latest socket without recreating the observer
  const socketLiveRef = useRef(null);
  // Audio deduplication refs so re-renders or repeated acks never replay sounds
  const deliveredSoundsRef = useRef(new Set());
  const seenSoundsRef = useRef(new Set());
  const peerPresentRef = useRef(false);

  // Stable callback for closing photo preview modal
  const handleClosePhotoPreview = useCallback(() => {
    setPendingPhoto(null);
  }, []);

  // Scroll helpers
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  const handleScroll = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const distFromBottom = vp.scrollHeight - vp.scrollTop - vp.clientHeight;
    const atBottom = distFromBottom < 60;
    setIsAtBottom(atBottom);
    if (atBottom) setNewMsgCount(0);
  }, []);

  // Photo timers tick effect
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setPhotoTimers(prev => {
        const updated = { ...prev };
        let changed = false;
        for (const [id, timer] of Object.entries(updated)) {
          const secLeft = Math.max(0, Math.ceil((timer.expiresAt - now) / 1000));
          if (secLeft !== timer.secondsLeft) {
            updated[id] = { ...timer, secondsLeft: secLeft };
            changed = true;
          }
        }
        return changed ? updated : prev;
      });
      setVoiceTimers(prev => {
        const updated = { ...prev };
        let changed = false;
        for (const [id, timer] of Object.entries(updated)) {
          const secLeft = Math.max(0, Math.ceil((timer.expiresAt - now) / 1000));
          if (secLeft <= 0) {
            delete updated[id];
            changed = true;
            setMessages(mPrev => mPrev.filter(m => m.id !== id));
          } else if (secLeft !== timer.secondsLeft) {
            updated[id] = { ...timer, secondsLeft: secLeft };
            changed = true;
          }
        }
        return changed ? updated : prev;
      });
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Close attachment menu on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(e.target)) {
        setAttachmentMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // WebSocket connection with authenticated ticket
  useEffect(() => {
    let isCancelled = false;

    function connectWs() {
      if (isCancelled) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        if (isCancelled) return;
        setConnectionStatus('connected');
        // Join with authenticated server ticket (not just credentials)
        ws.send(JSON.stringify({
          type: 'join',
          sessionId,
          ticket: authTicket,
          clientId
        }));
      };

      ws.onmessage = async (event) => {
        if (isCancelled) return;
        try {
          const data = JSON.parse(event.data);
          await handleWsMessage(data, ws);
        } catch (err) {
          console.error('WS message error:', err);
        }
      };

      ws.onclose = () => {
        if (isCancelled) return;
        setConnectionStatus('reconnecting');
        reconnectTimeoutRef.current = setTimeout(connectWs, 2200);
      };

      ws.onerror = () => {};
    }

    connectWs();

    return () => {
      isCancelled = true;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      socketRef.current?.close();
    };
  }, [sessionId, authTicket, clientId]);

  // Process incoming WebSocket messages
  const handleWsMessage = async (data, ws) => {
    switch (data.type) {
      case 'joined': {
        if (data.participantsCount >= 2) {
          setPeerPresent(true);
          onToast("You're both here.");
        }
        // Restore authoritative permanent participant-left status if present
        if (data.peerLeftStatus) {
          const text = data.peerLeftStatus.text || 'User left the session';
          const timestamp = data.peerLeftStatus.timestamp || Date.now();
          setSystemMessages(prev => {
            if (prev.some(m => m.text === text)) return prev;
            return [...prev, { id: 'peer-left-' + timestamp, text, timestamp }];
          });
        }
        // Replay recent envelopes, restoring server-persisted status (one-way)
        if (data.recentEnvelopes?.length > 0) {
          for (const env of data.recentEnvelopes) {
            // Skip unsent/deleted messages completely
            if (env.isUnsent) {
              continue;
            }

            // Voice note: if server has purged ciphertext (isExpired or ciphertext=null), do not display
            if (env.type === 'voice' && (env.isExpired || !env.ciphertext)) {
              continue;
            }

            try {
              const decrypted = await decryptPayload(cryptoKey, env);
              // Restore status from server — preserves seen/delivered across reconnects
              const restoredStatus = env.status || (env.isExpired ? 'seen' : 'sent');
              // If we already acked this as seen, mark idempotently
              if (restoredStatus === 'seen') {
                seenMessageIdsRef.current.add(env.id);
              }
              // Restore voice countdown timer if it's running
              if (env.type === 'voice' && env.voiceExpiresAt && !env.isExpired) {
                const secLeft = Math.max(0, Math.ceil((env.voiceExpiresAt - Date.now()) / 1000));
                if (secLeft > 0) {
                  const timerType = env.voiceTimerType || (env.voiceEnded ? 'listened' : 'unread');
                  setVoiceTimers(prev => ({
                    ...prev,
                    [env.id]: { expiresAt: env.voiceExpiresAt, secondsLeft: secLeft, timerType }
                  }));
                }
              }
              setMessages(prev => {
                if (prev.some(m => m.id === env.id)) return prev;
                return [...prev, {
                  id: env.id, senderId: env.senderId,
                  timestamp: env.timestamp, type: env.type || 'text',
                  status: restoredStatus,
                  seenAt: env.seenAt,
                  isViewOnce: env.isViewOnce,
                  isExpired: env.isExpired || false,
                  photoExpiresAt: env.photoExpiresAt,
                  photoOpened: env.photoOpened || false,
                  voiceExpiresAt: env.voiceExpiresAt,
                  voiceTimerType: env.voiceTimerType || (env.voiceEnded ? 'listened' : 'unread'),
                  voiceEnded: env.voiceEnded || false,
                  reactions: env.reactions || {},
                  replyTo: env.replyTo || decrypted.replyTo || null,
                  ...decrypted
                }];
              });
            } catch {}
          }
        }
        break;
      }

      case 'peer_joined':
      case 'peer_present': {
        const wasPresent = peerPresentRef.current;
        peerPresentRef.current = true;
        setPeerPresent(true);
        if (!wasPresent) {
          onToast("You're both here.");
          playUserJoinedSound();
        }
        break;
      }

      case 'peer_left': {
        const wasPresent = peerPresentRef.current;
        peerPresentRef.current = false;
        setPeerPresent(false);
        if (wasPresent) {
          playUserLeftSound();
        }
        break;
      }

      case 'peer_left_permanent':
      case 'peer_left_intentional': {
        const wasPresent = peerPresentRef.current;
        peerPresentRef.current = false;
        setPeerPresent(false);
        const text = data.text || 'User left the session';
        const timestamp = data.timestamp || Date.now();
        setSystemMessages(prev => {
          if (prev.some(m => m.text === text)) return prev;
          return [...prev, {
            id: 'peer-left-' + timestamp,
            text,
            timestamp
          }];
        });
        if (wasPresent) {
          playUserLeftSound();
        }
        break;
      }

      case 'message': {
        const env = data.envelope;
        try {
          const decrypted = await decryptPayload(cryptoKey, env);
          if (env.type === 'voice') {
            playVoiceNoteReceivedSound();
          } else if (env.type === 'photo') {
            playImageReceivedSound();
          } else {
            playReceivedSound();
          }

          const newMsg = {
            id: env.id, senderId: env.senderId,
            timestamp: env.timestamp, type: env.type || 'text',
            // Start at 'sent' — IntersectionObserver will upgrade to 'seen' when visible
            // For photos, seen happens only on explicit tap, not viewport
            status: 'delivered',
            isViewOnce: env.isViewOnce,
            isExpired: false,
            photoOpened: false,
            voiceExpiresAt: env.voiceExpiresAt,
            voiceTimerType: env.voiceTimerType || 'unread',
            voiceEnded: false,
            reactions: env.reactions || {},
            replyTo: env.replyTo || decrypted.replyTo || null,
            ...decrypted
          };

          setMessages(prev => [...prev, newMsg]);

          // If voice note has 180s timer attached, start local countdown immediately
          if (env.type === 'voice' && env.voiceExpiresAt) {
            const secLeft = Math.max(0, Math.ceil((env.voiceExpiresAt - Date.now()) / 1000));
            setVoiceTimers(prev => ({
              ...prev,
              [env.id]: {
                expiresAt: env.voiceExpiresAt,
                secondsLeft: secLeft,
                timerType: env.voiceTimerType || 'unread'
              }
            }));
          }

          // Track unread count if scrolled away
          if (!isAtBottom) {
            setNewMsgCount(c => c + 1);
          }

          // Immediately send delivery acknowledgement to the sender
          // This is separate from seen — purely indicates receipt of the message
          ws?.send(JSON.stringify({
            type: 'delivered',
            sessionId,
            messageId: env.id,
            senderId: clientId,
          }));

          // NOTE: We do NOT send 'seen' here.
          // 'seen' for text messages: sent by IntersectionObserver when message enters viewport.
          // 'seen' for photo messages: sent only when the user explicitly taps.
          // 'seen' for voice notes: sent in handleVoicePlaybackEnded after full playback.
        } catch {}
        break;
      }

      case 'message_ack': {
        // One-way: only upgrade from sending -> sent
        setMessages(prev => prev.map(m =>
          m.id === data.id ? updateMessageStatus(m, 'sent') : m
        ));
        break;
      }

      case 'delivered': {
        // One-way: only upgrade to delivered (won't downgrade from seen)
        setMessages(prev => prev.map(m =>
          m.id === data.messageId ? updateMessageStatus(m, 'delivered') : m
        ));
        if (!deliveredSoundsRef.current.has(data.messageId)) {
          deliveredSoundsRef.current.add(data.messageId);
          playDeliveredSound();
        }
        break;
      }

      case 'seen': {
        // One-way: only upgrade to seen
        setMessages(prev => prev.map(m =>
          m.id === data.messageId
            ? updateMessageStatus(m, 'seen', { seenAt: data.seenAt || Date.now() })
            : m
        ));
        if (!seenSoundsRef.current.has(data.messageId)) {
          seenSoundsRef.current.add(data.messageId);
          playSeenSound();
        }
        break;
      }

      case 'typing': {
        setIsPeerTyping(!!data.isTyping);
        break;
      }

      case 'message_unsent': {
        playUnsentSound();
        setVoiceTimers(prev => {
          const updated = { ...prev };
          delete updated[data.messageId];
          return updated;
        });
        setPhotoTimers(prev => {
          const updated = { ...prev };
          delete updated[data.messageId];
          return updated;
        });
        if (activeViewerMsg?.id === data.messageId) {
          setImageViewerOpen(false);
          setActiveViewerMsg(null);
        }
        if (activeMenuMsgId === data.messageId) setActiveMenuMsgId(null);
        if (replyingTo?.id === data.messageId) setReplyingTo(null);
        if (reactionPickerTarget?.id === data.messageId) setReactionPickerTarget(null);
        setMessages(prev => prev.filter(m => m.id !== data.messageId));
        break;
      }

      case 'reaction': {
        playTickSound();
        setMessages(prev => prev.map(m =>
          m.id === data.messageId ? { ...m, reactions: data.reactions } : m
        ));
        break;
      }

      case 'photo_countdown_started': {
        const { messageId, expiresAt } = data;
        const secLeft = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
        setPhotoTimers(prev => ({ ...prev, [messageId]: { expiresAt, secondsLeft: secLeft } }));
        // Update message state
        setMessages(prev => prev.map(m =>
          m.id === messageId ? { ...m, photoExpiresAt: expiresAt, photoOpened: true } : m
        ));
        break;
      }

      case 'photo_expired': {
        playImageExpiredSound();
        const { messageId } = data;
        setPhotoTimers(prev => {
          const updated = { ...prev };
          delete updated[messageId];
          return updated;
        });
        setMessages(prev => prev.map(m =>
          m.id === messageId ? { ...m, isExpired: true, photoUrl: null } : m
        ));
        if (activeViewerMsg?.id === messageId) {
          setImageViewerOpen(false);
          setActiveViewerMsg(null);
        }
        break;
      }

      case 'voice_countdown_started': {
        const { messageId, expiresAt, timerType } = data;
        const type = timerType || 'listened';
        const secLeft = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
        setVoiceTimers(prev => ({
          ...prev,
          [messageId]: { expiresAt, secondsLeft: secLeft, timerType: type }
        }));
        setMessages(prev => prev.map(m =>
          m.id === messageId
            ? {
                ...m,
                voiceExpiresAt: expiresAt,
                voiceTimerType: type,
                voiceEnded: type === 'listened' ? true : m.voiceEnded
              }
            : m
        ));
        break;
      }

      case 'voice_expired': {
        playImageExpiredSound();
        const { messageId } = data;
        setVoiceTimers(prev => {
          const updated = { ...prev };
          delete updated[messageId];
          return updated;
        });
        setMessages(prev => prev.filter(m => m.id !== messageId));
        break;
      }

      case 'chat_cleared': {
        setMessages([]);
        setPhotoTimers({});
        setVoiceTimers({});
        onToast('Chat cleared');
        break;
      }

      case 'session_burned': {
        setBurningTransition(true);
        playBurnSound();
        setTimeout(() => onSessionBurned(), 1400);
        break;
      }

      case 'session_expired': {
        onSessionExpired();
        break;
      }

      case 'error': {
        playErrorSound();
        onToast(data.message || 'Something went wrong');
        break;
      }

      default: break;
    }
  };

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (isAtBottom) scrollToBottom();
  }, [messages, isPeerTyping, isAtBottom, scrollToBottom]);

  // ── IntersectionObserver for real seen receipts ──
  // Observes each peer message bubble. When it enters the viewport with
  // sufficient visibility, we send a 'seen' ack — but only once per message.
  useEffect(() => {
    // Keep socketLiveRef in sync so the observer callback always has the latest socket
    socketLiveRef.current = socketRef.current;
  });

  useEffect(() => {
    // Only observe if we're the recipient (peer messages)
    // We reconnect the observer whenever messages change
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const messageId = entry.target.dataset.messageId;
          if (!messageId) return;
          // Idempotent: skip if already acknowledged
          if (seenMessageIdsRef.current.has(messageId)) return;
          seenMessageIdsRef.current.add(messageId);
          // Small debounce to avoid firing on fast scroll-through
          setTimeout(() => {
            const ws = socketLiveRef.current;
            if (ws?.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'seen',
                sessionId,
                messageId,
                senderId: clientId,
                seenAt: Date.now()
              }));
            }
          }, 120);
        });
      },
      {
        root: viewportRef.current,
        threshold: 0.6, // 60% of the bubble must be visible
      }
    );

    intersectionObserverRef.current = observer;

    // Observe all peer message wrappers that haven't been seen yet
    const wrappers = viewportRef.current?.querySelectorAll(
      '.message-wrapper.peer[data-message-id]'
    );
    if (wrappers) {
      wrappers.forEach(el => {
        const mid = el.dataset.messageId;
        if (!seenMessageIdsRef.current.has(mid)) {
          observer.observe(el);
        }
      });
    }

    return () => observer.disconnect();
  }, [messages, sessionId, clientId]); // Re-run when messages change

  // Typing debounce
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputText(val);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 110)}px`;
    }

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'typing', sessionId, isTyping: true, senderId: clientId
      }));
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current?.send(JSON.stringify({
          type: 'typing', sessionId, isTyping: false, senderId: clientId
        }));
      }, 1500);
    }
  };

  // Send text message
  const handleSendMessage = async () => {
    const text = inputText.trim();
    if (!text || !cryptoKey) return;

    const messageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = Date.now();
    const currentReply = replyingTo ? {
      id: replyingTo.id,
      senderId: replyingTo.senderId,
      type: replyingTo.type,
      text: replyingTo.text || ''
    } : null;

    setMessages(prev => [...prev, {
      id: messageId, senderId: clientId, text,
      timestamp: now, status: 'sending', type: 'text',
      replyTo: currentReply
    }]);
    setInputText('');
    setReplyingTo(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    playSentSound();
    scrollToBottom();

    try {
      const encrypted = await encryptPayload(cryptoKey, { text, replyTo: currentReply });
      const envelope = {
        id: messageId, senderId: clientId, type: 'text',
        timestamp: now, iv: encrypted.iv, ciphertext: encrypted.ciphertext,
        replyTo: currentReply
      };

      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: 'message', sessionId, envelope }));
      }
    } catch {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, status: 'error' } : m));
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Photo selection
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachmentMenuOpen(false);
    try {
      onToast('Compressing photo…');
      const compressed = await compressImage(file, 1280, 0.82);
      setPendingPhoto(compressed);
    } catch {
      onToast('Unable to load photo');
    } finally {
      e.target.value = '';
    }
  };

  // Send encrypted voice note
  const handleSendVoiceNote = async (audioBlob, duration) => {
    if (!cryptoKey || !audioBlob) return;

    const voiceId = `voice-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = Date.now();
    const currentReply = replyingTo ? {
      id: replyingTo.id,
      senderId: replyingTo.senderId,
      type: replyingTo.type,
      text: replyingTo.text || ''
    } : null;

    // Convert blob to base64 data URL for encryption
    const reader = new FileReader();
    const audioDataUrl = await new Promise((resolve, reject) => {
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(audioBlob);
    });

    // Optimistic UI — show immediately as sending
    setMessages(prev => [...prev, {
      id: voiceId, senderId: clientId, type: 'voice',
      audioDataUrl, duration, isExpired: false,
      timestamp: now, status: 'sending',
      replyTo: currentReply
    }]);
    setIsRecording(false);
    setReplyingTo(null);
    playVoiceNoteSentSound();
    scrollToBottom();

    try {
      const encrypted = await encryptPayload(cryptoKey, { audioDataUrl, duration, replyTo: currentReply });
      const envelope = {
        id: voiceId, senderId: clientId, type: 'voice',
        duration, timestamp: now, iv: encrypted.iv, ciphertext: encrypted.ciphertext,
        replyTo: currentReply
      };

      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: 'message', sessionId, envelope }));
      }
    } catch {
      setMessages(prev => prev.map(m => m.id === voiceId ? { ...m, status: 'error' } : m));
      onToast('Failed to send voice note');
    }
  };

  // Called by VoiceNoteBubble when recipient's audio ends — triggers server 60s timer
  const handleVoicePlaybackEnded = useCallback((messageId) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'voice_note_ended',
        sessionId,
        messageId,
        senderId: clientId,
      }));
    }

    // Also send seen receipt for this voice note if not yet sent
    if (!seenMessageIdsRef.current.has(messageId)) {
      seenMessageIdsRef.current.add(messageId);
      socketRef.current?.send(JSON.stringify({
        type: 'seen',
        sessionId,
        messageId,
        senderId: clientId,
        seenAt: Date.now(),
      }));
    }
  }, [sessionId, clientId]);

  // Send encrypted photo
  const handleSendPhoto = async ({ dataUrl, isViewOnce }) => {
    const photoId = `photo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = Date.now();
    const currentReply = replyingTo ? {
      id: replyingTo.id,
      senderId: replyingTo.senderId,
      type: replyingTo.type,
      text: replyingTo.text || ''
    } : null;

    setMessages(prev => [...prev, {
      id: photoId, senderId: clientId, type: 'photo',
      photoUrl: dataUrl, isViewOnce, isExpired: false,
      timestamp: now, status: 'sending',
      replyTo: currentReply
    }]);
    setReplyingTo(null);
    playSentSound();
    scrollToBottom();

    try {
      const encrypted = await encryptPayload(cryptoKey, { photoUrl: dataUrl, isViewOnce, replyTo: currentReply });
      const envelope = {
        id: photoId, senderId: clientId, type: 'photo',
        isViewOnce, timestamp: now, iv: encrypted.iv, ciphertext: encrypted.ciphertext,
        replyTo: currentReply
      };

      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: 'message', sessionId, envelope }));
      }

      setMessages(prev => prev.map(m => m.id === photoId ? { ...m, status: 'sent' } : m));
      onToast('Encrypted photo sent');
    } catch {
      setMessages(prev => prev.map(m => m.id === photoId ? { ...m, status: 'error' } : m));
    }
  };

  // Reveal photo — called by PhotoBubble when recipient explicitly taps "Tap to view"
  // This is the single authoritative place that:
  // 1. Tells the server to start the 30s expiration timer (photo_opened)
  // 2. Sends the seen receipt for the photo message (explicit tap = seen)
  const handleRevealPhoto = (msg) => {
    const isSelf = msg.senderId === clientId;

    // Only non-sender triggers the server-side timer and seen receipt
    if (!isSelf && !msg.isExpired) {
      // Start server-authoritative 30s timer
      if (!photoTimers[msg.id]) {
        socketRef.current?.send(JSON.stringify({
          type: 'photo_opened', sessionId, messageId: msg.id
        }));
      }

      // Send seen receipt for this photo — only if not already sent
      if (!seenMessageIdsRef.current.has(msg.id)) {
        seenMessageIdsRef.current.add(msg.id);
        socketRef.current?.send(JSON.stringify({
          type: 'seen',
          sessionId,
          messageId: msg.id,
          senderId: clientId,
          seenAt: Date.now(),
        }));
      }
    }

    // Upgrade local message state: photoOpened = true
    setMessages(prev => prev.map(m =>
      m.id === msg.id ? { ...m, photoOpened: true } : m
    ));
  };

  // Open photo in full-screen in-app viewer (starts timer & seen receipt on first reveal)
  const handleOpenViewer = (msg) => {
    handleRevealPhoto(msg);
    setActiveViewerMsg(msg);
    setImageViewerOpen(true);
    playViewOnceOpenedSound();
  };

  // Close full-screen in-app viewer
  const handleCloseViewer = () => {
    setImageViewerOpen(false);
    setActiveViewerMsg(null);
  };

  // Unsend
  const handleUnsend = (messageId) => {
    socketRef.current?.send(JSON.stringify({
      type: 'unsend', sessionId, messageId, senderId: clientId
    }));
    playUnsentSound();
    if (activeMenuMsgId === messageId) setActiveMenuMsgId(null);
    if (replyingTo?.id === messageId) setReplyingTo(null);
    if (reactionPickerTarget?.id === messageId) setReactionPickerTarget(null);
    setMessages(prev => prev.filter(m => m.id !== messageId));
    setPhotoTimers(prev => { const u = { ...prev }; delete u[messageId]; return u; });
    setVoiceTimers(prev => { const u = { ...prev }; delete u[messageId]; return u; });
  };

  // Toggle reaction on a message
  const handleToggleReaction = (messageId, emoji) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    playTickSound();
    socketRef.current.send(JSON.stringify({
      type: 'reaction',
      sessionId,
      messageId,
      emoji,
      senderId: clientId
    }));

    // Optimistic local update enforcing exactly one reaction per user
    setMessages(prev => prev.map(m => {
      if (m.id !== messageId) return m;
      return {
        ...m,
        reactions: applyUserReaction(m.reactions, clientId, emoji)
      };
    }));
  };

  // Insert emoji or U2U token into composer textarea
  const handleInsertEmoji = (emojiTokenOrUnicode) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setInputText(prev => prev + emojiTokenOrUnicode);
      return;
    }
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const nextText = inputText.substring(0, start) + emojiTokenOrUnicode + inputText.substring(end);
    setInputText(nextText);
    setTimeout(() => {
      textarea.focus();
      const newPos = start + emojiTokenOrUnicode.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 10);
  };

  // Copy text
  const handleCopyText = async (text) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      playTickSound();
      onToast('Copied');
    } catch {}
  };

  // Long-press message action (mobile)
  const handlePointerDown = (e, msg) => {
    if (msg.isUnsent || msg.isExpired) return;
    longPressTimerRef.current = setTimeout(() => {
      setActionTarget(msg);
    }, 450);
  };

  const handlePointerUp = () => {
    clearTimeout(longPressTimerRef.current);
  };

  // Right-click message action (desktop)
  const handleContextMenu = (e, msg) => {
    if (msg.isUnsent || msg.isExpired) return;
    e.preventDefault();
    setActionTarget(msg);
  };

  // Clear chat
  const handleClearChat = () => {
    setMessages([]);
    setPhotoTimers({});
    socketRef.current?.send(JSON.stringify({ type: 'clear_chat', sessionId }));
    onToast('Chat cleared');
  };

  // Burn session
  const handleBurnSession = () => {
    socketRef.current?.send(JSON.stringify({ type: 'burn_session', sessionId }));
  };

  // Leave session
  const handleLeave = () => {
    socketRef.current?.send(JSON.stringify({
      type: 'leave_session', sessionId, clientId
    }));
    setTimeout(() => onLeave(), 100);
  };

  if (burningTransition) {
    return (
      <div className="flow-wrapper">
        <div className="flow-card" style={{ textAlign: 'center' }}>
          <h2 className="modal-title">Session deleted.</h2>
          <p className="modal-description" style={{ marginBottom: 0 }}>Nothing more to see here.</p>
        </div>
      </div>
    );
  }

  // Merge messages and system messages in chronological order
  const allItems = [
    ...messages
      .filter(m => !m.isUnsent && !(m.type === 'voice' && (m.isExpired || (voiceTimers[m.id] && voiceTimers[m.id].secondsLeft <= 0))))
      .map(m => ({ ...m, itemType: 'message' })),
    ...systemMessages.map(s => ({ ...s, itemType: 'system' }))
  ].sort((a, b) => (a.timestamp || a.id) - (b.timestamp || b.id));

  return (
    <div className="chat-container">
      {connectionStatus === 'reconnecting' && (
        <div className="connection-banner">
          <WifiOff size={14} style={{ color: 'var(--status-warning)' }} />
          <span>Connection interrupted. Reconnecting…</span>
        </div>
      )}

      {/* Messages area */}
      <div
        className="messages-viewport"
        ref={viewportRef}
        onScroll={handleScroll}
      >
        {allItems.length === 0 ? (
          <div className="chat-empty-state">
            <div className="empty-state-icon">
              <div className="brand-dots-icon">
                <div className="brand-dot" />
                <div className="brand-line" style={{ width: 14 }} />
                <div className="brand-dot" />
              </div>
            </div>
            <h3>You're connected.</h3>
            <p>This is a private conversation between two people. Say hello.</p>
          </div>
        ) : (
          allItems.map((item) => {
            if (item.itemType === 'system') {
              return (
                <div key={item.id} className="system-message">
                  <div className="system-message-line" />
                  <span className="system-message-text">{item.text}</span>
                  <div className="system-message-line" />
                </div>
              );
            }

            const msg = item;
            const isSelf = msg.senderId === clientId;
            const timer = photoTimers[msg.id];
            const voiceTimer = voiceTimers[msg.id];
            // For peer text/voice messages: mark data-message-id so IntersectionObserver can find it
            // For photo messages: seen is triggered only on explicit tap, NOT by viewport
            // Voice notes: seen is triggered on full playback completion via onPlaybackEnded
            const isObservable = !isSelf && msg.type === 'text';

            return (
              <div
                key={msg.id}
                className={`message-wrapper ${isSelf ? 'self' : 'peer'}`}
                data-message-id={isObservable ? msg.id : undefined}
              >
                <div className="message-bubble-line">
                  {/* Three-dot button for self message (left of bubble) */}
                  {isSelf && (
                    <button
                      type="button"
                      className={`message-more-btn ${activeMenuMsgId === msg.id ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuMsgId(activeMenuMsgId === msg.id ? null : msg.id);
                      }}
                      aria-label="Message options"
                      title="More options"
                    >
                      <MoreHorizontal size={15} />
                    </button>
                  )}

                  <div
                    className={`message-bubble ${msg.type === 'voice' ? 'voice-bubble-wrapper' : ''} ${msg.type === 'photo' ? 'photo-bubble-wrapper' : ''}`}
                    onPointerDown={(e) => handlePointerDown(e, msg)}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    onContextMenu={(e) => handleContextMenu(e, msg)}
                  >
                    {/* Reply Quote Banner */}
                    {msg.replyTo && (
                      <MessageReplyQuote
                        replyTo={msg.replyTo}
                        currentUserId={clientId}
                      />
                    )}

                    {/* Text message with U2U emoji rendering */}
                    {msg.type === 'text' && (
                      <span>{renderMessageContent(msg.text)}</span>
                    )}

                    {/* Photo message */}
                    {msg.type === 'photo' && (
                      <PhotoBubble
                        msg={msg}
                        isSelf={isSelf}
                        timer={timer}
                        onExpandViewer={handleOpenViewer}
                      />
                    )}

                    {/* Voice note message */}
                    {msg.type === 'voice' && (
                      <VoiceNoteBubble
                        msg={msg}
                        isSelf={isSelf}
                        voiceTimer={voiceTimer}
                        onPlaybackEnded={handleVoicePlaybackEnded}
                      />
                    )}
                  </div>

                  {/* Three-dot button for peer message (right of bubble) */}
                  {!isSelf && (
                    <button
                      type="button"
                      className={`message-more-btn ${activeMenuMsgId === msg.id ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuMsgId(activeMenuMsgId === msg.id ? null : msg.id);
                      }}
                      aria-label="Message options"
                      title="More options"
                    >
                      <MoreHorizontal size={15} />
                    </button>
                  )}

                  {/* Contextual 3-Dot Message Menu */}
                  {activeMenuMsgId === msg.id && (
                    <MessageMenu
                      isOpen={true}
                      onClose={() => setActiveMenuMsgId(null)}
                      targetMessage={msg}
                      isSelf={isSelf}
                      currentUserId={clientId}
                      onReply={(target) => {
                        setReplyingTo(target);
                        textareaRef.current?.focus();
                      }}
                      onCopy={handleCopyText}
                      onUnsend={handleUnsend}
                      onReact={handleToggleReaction}
                      onOpenFullReactionPicker={(target) => {
                        setReactionPickerTarget(target);
                      }}
                    />
                  )}
                </div>

                {/* Message Reactions Row */}
                <MessageReactions
                  reactions={msg.reactions}
                  currentUserId={clientId}
                  onToggleReaction={handleToggleReaction}
                  messageId={msg.id}
                  isSelf={isSelf}
                />

                {/* Message metadata */}
                <div className="message-meta">
                  <span
                    className="message-time"
                    onMouseEnter={() => setTooltipMsgId(msg.id)}
                    onMouseLeave={() => setTooltipMsgId(null)}
                  >
                    {formatContextualTime(msg.timestamp)}
                    {tooltipMsgId === msg.id && (
                      <div className="message-time-tooltip">
                        {formatFullTime(msg.timestamp)}
                      </div>
                    )}
                  </span>
                  {/* Show status ticks only on sender's own messages */}
                  {isSelf && (
                    <MessageStatus status={msg.status} seenAt={msg.seenAt} />
                  )}
                  {/* Show send error */}
                  {msg.status === 'error' && (
                    <AlertCircle size={12} style={{ color: 'var(--status-danger)', marginLeft: 2 }} />
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* New messages indicator */}
      {!isAtBottom && newMsgCount > 0 && (
        <div className="new-messages-indicator">
          <button className="new-messages-pill" onClick={() => { scrollToBottom(); setNewMsgCount(0); }}>
            <ChevronDown size={15} />
            {newMsgCount} new message{newMsgCount !== 1 ? 's' : ''}
          </button>
        </div>
      )}

      {/* Typing indicator */}
      {isPeerTyping && (
        <div className="typing-bar">
          <div className="typing-dots">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
        </div>
      )}

      {/* File input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        style={{ display: 'none' }}
      />

      {/* Composer */}
      <div className="composer-wrapper" style={{ position: 'relative' }}>
        {/* Reply Preview Bar above Composer */}
        <ComposerReplyBar
          replyingTo={replyingTo}
          onCancel={() => setReplyingTo(null)}
          currentUserId={clientId}
        />

        {/* Attachment popover */}
        {!isRecording && attachmentMenuOpen && (
          <div className="attachment-popover" ref={attachmentMenuRef}>
            <button className="attachment-item-btn" onClick={() => fileInputRef.current?.click()}>
              <ImageIcon size={16} style={{ color: 'var(--accent)' }} />
              <span>Photo</span>
            </button>
          </div>
        )}

        {/* Voice recorder replaces composer bar while recording */}
        {isRecording ? (
          <VoiceRecorder
            onSend={handleSendVoiceNote}
            onCancel={(reason) => {
              setIsRecording(false);
              if (reason === 'mic_denied') {
                onToast('Microphone access denied. Check your browser permissions.');
              }
            }}
          />
        ) : (
          <div className="composer-bar">
            <button
              className="composer-add-btn"
              onClick={() => setAttachmentMenuOpen(!attachmentMenuOpen)}
              title="Add photo"
              aria-label="Add attachment"
            >
              <Plus size={19} />
            </button>

            <textarea
              ref={textareaRef}
              className="composer-input"
              placeholder="Write a message…"
              rows={1}
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
            />

            {/* Dedicated U2U Emoji Picker Button */}
            <button
              type="button"
              className={`composer-emoji-btn ${emojiPickerOpen ? 'active' : ''}`}
              onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}
              title="U2U Emojis"
              aria-label="Open U2U emoji picker"
            >
              <Smile size={18} />
            </button>

            {/* Mic button — shown when input is empty */}
            {!inputText.trim() && (
              <button
                className="composer-mic-btn"
                onClick={() => setIsRecording(true)}
                title="Send a voice note"
                aria-label="Record voice note"
              >
                <Mic size={18} />
              </button>
            )}

            {/* Send button — shown when there is text */}
            {inputText.trim() && (
              <button
                className="composer-send-btn"
                onClick={handleSendMessage}
                title="Send message"
                aria-label="Send"
              >
                <ArrowUp size={18} />
              </button>
            )}
          </div>
        )}

        {/* U2U Emoji Picker Popover */}
        <EmojiPickerModal
          isOpen={emojiPickerOpen}
          onClose={() => setEmojiPickerOpen(false)}
          onSelectEmoji={handleInsertEmoji}
          title="U2U Emojis"
        />
      </div>

      {/* Modals */}
      <PhotoPreviewModal
        isOpen={!!pendingPhoto}
        photoData={pendingPhoto}
        onClose={handleClosePhotoPreview}
        onSendPhoto={handleSendPhoto}
      />

      <ImageViewerModal
        isOpen={imageViewerOpen && !!activeViewerMsg}
        photoUrl={activeViewerMsg ? (messages.find(m => m.id === activeViewerMsg.id)?.photoUrl || activeViewerMsg.photoUrl) : null}
        messageId={activeViewerMsg?.id}
        expiresAt={activeViewerMsg ? photoTimers[activeViewerMsg.id]?.expiresAt : null}
        isExpired={activeViewerMsg ? (messages.find(m => m.id === activeViewerMsg.id)?.isExpired || activeViewerMsg.isExpired || (photoTimers[activeViewerMsg.id]?.secondsLeft <= 0)) : false}
        onPhotoExpired={(id) => {
          setMessages(prev => prev.map(m =>
            m.id === id ? { ...m, isExpired: true, photoUrl: null } : m
          ));
          setPhotoTimers(prev => { const u = { ...prev }; delete u[id]; return u; });
          handleCloseViewer();
        }}
        onClose={handleCloseViewer}
      />

      <SecurityModal isOpen={securityModalOpen} onClose={() => setSecurityModalOpen(false)} />
      <ClearChatModal isOpen={clearChatModalOpen} onClose={() => setClearChatModalOpen(false)} onConfirm={handleClearChat} />
      <BurnSessionModal isOpen={burnSessionModalOpen} onClose={() => setBurnSessionModalOpen(false)} onConfirm={handleBurnSession} />
      <LeaveSessionModal isOpen={leaveModalOpen} onClose={() => setLeaveModalOpen(false)} onConfirm={handleLeave} />

      <MessageActionModal
        isOpen={!!actionTarget}
        onClose={() => setActionTarget(null)}
        targetMessage={actionTarget}
        isSelf={actionTarget?.senderId === clientId}
        onCopy={handleCopyText}
        onUnsend={handleUnsend}
      />

      {/* Full Reaction Emoji Picker for Messages */}
      <EmojiPickerModal
        isOpen={!!reactionPickerTarget}
        onClose={() => setReactionPickerTarget(null)}
        onSelectEmoji={(emoji) => {
          if (reactionPickerTarget) {
            handleToggleReaction(reactionPickerTarget.id, emoji);
          }
        }}
        isReactionPicker={true}
        title="React to message"
      />
    </div>
  );
}
