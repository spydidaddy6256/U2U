import React from 'react';
import U2UEmoji from '../emojis/U2UEmoji';

/**
 * MessageReactions Component:
 * Displays active reactions underneath or around a message bubble.
 * Synchronized in realtime and persists across session lifecycle.
 */
export default function MessageReactions({
  reactions = {},
  currentUserId,
  onToggleReaction,
  messageId,
  isSelf
}) {
  if (!reactions || typeof reactions !== 'object') return null;

  const entries = Object.entries(reactions).filter(([_, senders]) => Array.isArray(senders) && senders.length > 0);
  if (entries.length === 0) return null;

  return (
    <div className={`message-reactions-row ${isSelf ? 'align-self' : 'align-peer'}`}>
      {entries.map(([emoji, senders]) => {
        const isU2U = emoji.startsWith(':u2u-') && emoji.endsWith(':');
        const count = senders.length;
        const reactedByMe = senders.includes(currentUserId);

        return (
          <button
            key={emoji}
            type="button"
            className={`reaction-pill ${reactedByMe ? 'my-reaction' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleReaction(messageId, emoji);
            }}
            title={`${isU2U ? emoji.slice(1, -1) : emoji} (${count})`}
            aria-label={`Reaction ${emoji}, count ${count}`}
          >
            {isU2U ? (
              <U2UEmoji name={emoji.slice(1, -1)} size={15} />
            ) : (
              <span className="reaction-unicode">{emoji}</span>
            )}
            {count > 1 && <span className="reaction-count">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
