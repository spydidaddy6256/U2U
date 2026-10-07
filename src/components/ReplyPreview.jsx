import React from 'react';
import { Reply, X, Image as ImageIcon, Mic } from 'lucide-react';
import { renderMessageContent } from './emojis/U2UEmoji';

/**
 * ReplyPreview Component:
 * Shows a docked preview banner above the composer when replying to a message.
 */
export function ComposerReplyBar({ replyingTo, onCancel, currentUserId }) {
  if (!replyingTo) return null;

  const isSelf = replyingTo.senderId === currentUserId;
  const isPhoto = replyingTo.type === 'photo';
  const isVoice = replyingTo.type === 'voice';

  return (
    <div className="composer-reply-bar">
      <div className="reply-bar-accent" />
      <div className="reply-bar-content">
        <div className="reply-bar-header">
          <Reply size={13} className="reply-icon" />
          <span className="reply-author">
            Replying to {isSelf ? 'yourself' : 'peer'}
          </span>
        </div>
        <div className="reply-bar-text">
          {isPhoto && (
            <span className="media-preview-tag">
              <ImageIcon size={12} /> Photo
            </span>
          )}
          {isVoice && (
            <span className="media-preview-tag">
              <Mic size={12} /> Voice Note
            </span>
          )}
          {!isPhoto && !isVoice && (
            <span className="preview-text-snippet">
              {renderMessageContent(replyingTo.text || 'Message')}
            </span>
          )}
        </div>
      </div>
      <button
        type="button"
        className="reply-cancel-btn"
        onClick={onCancel}
        aria-label="Cancel reply"
      >
        <X size={15} />
      </button>
    </div>
  );
}

/**
 * MessageReplyQuote Component:
 * Shows a compact quote chip inside a message bubble that is a reply to another message.
 */
export function MessageReplyQuote({ replyTo, currentUserId, onClick }) {
  if (!replyTo) return null;

  const isSelf = replyTo.senderId === currentUserId;
  const isPhoto = replyTo.type === 'photo';
  const isVoice = replyTo.type === 'voice';

  return (
    <div
      className="message-reply-quote"
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="quote-accent-bar" />
      <div className="quote-body">
        <span className="quote-author">
          {isSelf ? 'You' : 'Peer'}
        </span>
        <span className="quote-content">
          {isPhoto ? (
            <span className="quote-media-indicator"><ImageIcon size={11} /> Photo</span>
          ) : isVoice ? (
            <span className="quote-media-indicator"><Mic size={11} /> Voice Note</span>
          ) : (
            renderMessageContent(replyTo.text || 'Message')
          )}
        </span>
      </div>
    </div>
  );
}
