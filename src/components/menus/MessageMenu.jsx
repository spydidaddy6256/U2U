import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
 * Rendered via portal with viewport-aware placement to ensure it is never hidden
 * behind the bottom composer, screen edges, or header.
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
  const [placement, setPlacement] = useState('top');
  const [coords, setCoords] = useState(null);

  const updatePosition = useCallback(() => {
    if (!menuRef.current || !targetMessage) return;

    // Anchor element: prioritize passed anchorEl (3-dot button) or message bubble
    const anchor = anchorEl || (typeof document !== 'undefined'
      ? document.querySelector(`[data-message-id="${targetMessage.id}"] .message-more-btn`) ||
        document.querySelector(`[data-message-id="${targetMessage.id}"] .message-bubble`)
      : null);
    if (!anchor) return;

    const anchorRect = anchor.getBoundingClientRect();
    const bubbleEl = anchor.closest('.message-bubble-line')?.querySelector('.message-bubble') ||
      anchor.closest('.message-wrapper')?.querySelector('.message-bubble');
    const targetRect = bubbleEl ? bubbleEl.getBoundingClientRect() : anchorRect;

    const menuRect = menuRef.current.getBoundingClientRect();
    const menuWidth = menuRect.width || 250;
    const menuHeight = menuRect.height || 230;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Viewport boundaries: safe from top header, identity subbar, and bottom composer
    const headerEl = document.querySelector('.u2u-header');
    const subbarEl = document.querySelector('.u2u-identity-subbar');
    const headerRect = headerEl ? headerEl.getBoundingClientRect() : null;
    const subbarRect = subbarEl ? subbarEl.getBoundingClientRect() : null;
    let safeTop = Math.max(8, (headerRect && headerRect.bottom > 0) ? headerRect.bottom + 6 : 8);
    if (subbarRect && subbarRect.bottom > safeTop) {
      safeTop = subbarRect.bottom + 6;
    }

    const composerEl = document.querySelector('.composer-wrapper') || document.querySelector('.composer-bar');
    const composerRect = composerEl ? composerEl.getBoundingClientRect() : null;
    const safeBottom = Math.min(
      viewportHeight - 8,
      (composerRect && composerRect.top < viewportHeight) ? composerRect.top - 8 : viewportHeight - 8
    );

    // If message is completely off-screen, dismiss menu
    if (targetRect.bottom < safeTop - 40 || targetRect.top > safeBottom + 40) {
      onClose();
      return;
    }

    const availableHeight = Math.max(160, safeBottom - safeTop);
    const maxMenuHeight = Math.min(availableHeight, 420);

    const spaceAbove = targetRect.top - safeTop;
    const spaceBelow = safeBottom - targetRect.bottom;

    let chosenPlacement = 'top';
    let calculatedTop;

    // Prefer positioning ABOVE the message so the bottom composer never obscures it
    if (spaceAbove >= menuHeight + 6) {
      chosenPlacement = 'top';
      calculatedTop = targetRect.top - menuHeight - 6;
    } else if (spaceBelow >= menuHeight + 6) {
      chosenPlacement = 'bottom';
      calculatedTop = targetRect.bottom + 6;
    } else {
      // Pick the side with more room and clamp to bounds
      if (spaceAbove >= spaceBelow) {
        chosenPlacement = 'top';
        calculatedTop = Math.max(safeTop, targetRect.top - menuHeight - 6);
      } else {
        chosenPlacement = 'bottom';
        calculatedTop = Math.min(safeBottom - menuHeight, Math.max(safeTop, targetRect.bottom + 6));
      }
    }

    // Strict vertical clamping within safe viewport bounds
    calculatedTop = Math.max(safeTop, Math.min(calculatedTop, safeBottom - Math.min(menuHeight, maxMenuHeight)));

    // Horizontal placement:
    // Self messages: align right edge with message bubble's right edge
    // Peer messages: align left edge with message bubble's left edge
    let calculatedLeft;
    if (isSelf) {
      calculatedLeft = targetRect.right - menuWidth;
    } else {
      calculatedLeft = targetRect.left;
    }

    // Clamp horizontal position so menu stays comfortably within screen edges
    calculatedLeft = Math.max(10, Math.min(calculatedLeft, viewportWidth - menuWidth - 10));

    setPlacement(chosenPlacement);
    setCoords({
      top: Math.round(calculatedTop),
      left: Math.round(calculatedLeft),
      maxHeight: Math.round(maxMenuHeight),
      placement: chosenPlacement
    });
  }, [anchorEl, isSelf, onClose, targetMessage]);

  // Position immediately before browser paint to prevent jumping
  useLayoutEffect(() => {
    if (!isOpen) return;

    updatePosition();

    function handleScroll() {
      updatePosition();
    }

    function handleResize() {
      updatePosition();
    }

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, showDetails, updatePosition]);

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
        if (anchorEl && (anchorEl === e.target || anchorEl.contains(e.target))) return;
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

  const finalStyle = coords ? {
    position: 'fixed',
    top: `${coords.top}px`,
    left: `${coords.left}px`,
    maxHeight: `${coords.maxHeight}px`,
    overflowY: 'auto',
    zIndex: 2500,
    opacity: 1,
    visibility: 'visible',
    pointerEvents: 'auto'
  } : {
    position: 'fixed',
    top: -9999,
    left: -9999,
    opacity: 0,
    visibility: 'hidden',
    pointerEvents: 'none',
    zIndex: 2500
  };

  const menuContent = (
    <div
      ref={menuRef}
      className={`message-context-menu placement-${placement} ${isSelf ? 'align-self' : 'align-peer'}`}
      style={finalStyle}
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

  return typeof document !== 'undefined' ? createPortal(menuContent, document.body) : menuContent;
}
