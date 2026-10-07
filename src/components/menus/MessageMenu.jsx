import React, { useEffect, useRef, useState } from 'react';
import {
  Reply, Copy, Trash2, Smile, Info, Plus
} from 'lucide-react';
import U2UEmoji from '../emojis/U2UEmoji';
import { QUICK_REACTIONS } from '../../data/u2uEmojis';
import { formatFullTime } from '../../utils/time';
import { getUserReaction } from '../../utils/reactions';

/**
 * MessageMenu Component:
 * Contextual 3-dot action popover attached directly to a specific message bubble.
 * Includes quick reaction pill bar + contextual action items (Reply, Copy, Unsend, React, More).
 */
export default function MessageMenu({
  isOpen,
  onClose,
  targetMessage,
  isSelf,
  currentUserId,
  anchorEl,
  onReply,
  onCopy,
  onUnsend,
  onReact,
  onOpenFullReactionPicker
}) {
  const menuRef = useRef(null);
  const [showDetails, setShowDetails] = useState(false);

  // Close on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    }

    function handlePointerDown(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        // If clicked on anchor button, let its own click handler toggle
        if (anchorEl && anchorEl.contains(e.target)) return;
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isOpen, onClose, anchorEl]);

  if (!isOpen || !targetMessage) return null;

  const isText = targetMessage.type === 'text';
  const isPhoto = targetMessage.type === 'photo';
  const isVoice = targetMessage.type === 'voice';
  const isExpired = targetMessage.isExpired;
  const activeReaction = getUserReaction(targetMessage.reactions, currentUserId);

  const handleAction = (callback, ...args) => {
    onClose();
    if (callback) callback(...args);
  };

  return (
    <div
      ref={menuRef}
      className={`message-context-menu ${isSelf ? 'align-self' : 'align-peer'}`}
      onClick={(e) => e.stopPropagation()}
      role="menu"
      aria-label="Message options"
    >
      {/* 1. Quick Reactions Bar */}
      <div className="menu-quick-reactions-bar">
        {QUICK_REACTIONS.map((emojiToken) => {
          const isU2U = emojiToken.startsWith(':u2u-') && emojiToken.endsWith(':');
          const isReacted = activeReaction === emojiToken;
          return (
            <button
              key={emojiToken}
              type="button"
              className={`quick-reaction-btn ${isReacted ? 'active' : ''}`}
              onClick={() => handleAction(onReact, targetMessage.id, emojiToken)}
              title={isU2U ? emojiToken.slice(1, -1) : emojiToken}
            >
              {isU2U ? (
                <U2UEmoji name={emojiToken.slice(1, -1)} size={18} />
              ) : (
                <span className="reaction-unicode-glyph">{emojiToken}</span>
              )}
            </button>
          );
        })}
        {/* Full Reaction Picker Button */}
        <button
          type="button"
          className="quick-reaction-btn more-reactions-btn"
          onClick={() => {
            onClose();
            if (onOpenFullReactionPicker) onOpenFullReactionPicker(targetMessage);
          }}
          title="More reactions"
          aria-label="Open reaction picker"
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="menu-divider" />

      {/* 2. Contextual Actions List */}
      <div className="menu-actions-list">
        {/* Reply */}
        <button
          type="button"
          className="menu-action-item"
          onClick={() => handleAction(onReply, targetMessage)}
        >
          <Reply size={15} />
          <span>Reply</span>
        </button>

        {/* Copy (Text messages only) */}
        {isText && targetMessage.text && (
          <button
            type="button"
            className="menu-action-item"
            onClick={() => handleAction(onCopy, targetMessage.text)}
          >
            <Copy size={15} />
            <span>Copy</span>
          </button>
        )}

        {/* React */}
        <button
          type="button"
          className="menu-action-item"
          onClick={() => {
            onClose();
            if (onOpenFullReactionPicker) onOpenFullReactionPicker(targetMessage);
          }}
        >
          <Smile size={15} />
          <span>React</span>
        </button>

        {/* Unsend (Sender only, active messages) */}
        {isSelf && !isExpired && (
          <button
            type="button"
            className="menu-action-item danger"
            onClick={() => handleAction(onUnsend, targetMessage.id)}
          >
            <Trash2 size={15} />
            <span>Unsend</span>
          </button>
        )}

        {/* Message Details Toggle */}
        <button
          type="button"
          className="menu-action-item"
          onClick={() => setShowDetails(!showDetails)}
        >
          <Info size={15} />
          <span>Details</span>
        </button>

        {showDetails && (
          <div className="menu-details-card">
            <div className="detail-row">
              <span className="detail-label">Sent</span>
              <span className="detail-value">{formatFullTime(targetMessage.timestamp)}</span>
            </div>
            {isSelf && targetMessage.status && (
              <div className="detail-row">
                <span className="detail-label">Status</span>
                <span className="detail-value status-badge">{targetMessage.status}</span>
              </div>
            )}
            <div className="detail-row">
              <span className="detail-label">Type</span>
              <span className="detail-value">{isPhoto ? 'Photo' : isVoice ? 'Voice Note' : 'Text'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
