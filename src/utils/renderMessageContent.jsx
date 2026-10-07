import React from 'react';
import U2UEmoji from '../components/emojis/U2UEmoji';

/**
 * Helper to render message text containing U2U tokens like `:u2u-heart:`
 * smoothly as inline SVG components alongside ordinary text.
 */
export function renderMessageContent(text) {
  if (!text || typeof text !== 'string') return text;

  // Regex matches :u2u-[a-z0-9_-]+:
  const tokenRegex = /(:u2u-[a-z0-9_-]+:)/g;
  const parts = text.split(tokenRegex);

  if (parts.length === 1) return text;

  return parts.map((part, index) => {
    if (part.startsWith(':u2u-') && part.endsWith(':')) {
      const id = part.slice(1, -1);
      return <U2UEmoji key={index} name={id} size={20} className="inline-u2u-emoji" />;
    }
    return part;
  });
}
