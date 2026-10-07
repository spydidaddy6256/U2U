import React from 'react';
import { Check, CheckCheck } from 'lucide-react';

/**
 * MessageStatus Component
 * Strictly renders the 3 states required by U2U:
 * - 'sent': Single check ✓
 * - 'delivered': Double check ✓✓ (subtle)
 * - 'seen': Double check ✓✓ with U2U seen/read accent styling
 */
export default function MessageStatus({ status, seenAt }) {
  if (!status || status === 'sending') {
    return (
      <span className="message-status status-sending" title="Sending…">
        <span className="sending-dot" />
      </span>
    );
  }

  if (status === 'sent') {
    return (
      <span className="message-status status-sent" title="Sent">
        <Check size={13} className="tick-icon tick-single" />
      </span>
    );
  }

  if (status === 'delivered') {
    return (
      <span className="message-status status-delivered" title="Delivered">
        <CheckCheck size={13} className="tick-icon tick-double" />
      </span>
    );
  }

  if (status === 'seen') {
    return (
      <span 
        className="message-status status-seen" 
        title={seenAt ? `Seen · ${new Date(seenAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Seen'}
      >
        <CheckCheck size={13} className="tick-icon tick-double seen" />
      </span>
    );
  }

  return null;
}
