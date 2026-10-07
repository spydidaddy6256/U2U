/**
 * Time utilities for U2U — Instagram-style contextual timestamps
 */

/**
 * Format relative time as Instagram/iMessage would show it:
 * - Now (< 60s)
 * - 2m  (< 60m)
 * - 1h  (< 24h same day)
 * - Yesterday
 * - Sep 30  (same year, older)
 * - 30 Sep 2024  (different year)
 */
export function formatContextualTime(timestamp) {
  if (!timestamp) return '';
  const now = Date.now();
  const t = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime();
  const diffMs = now - t;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffSec < 60) return 'Now';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHour < 24) return `${diffHour}h`;

  const msgDate = new Date(t);
  const todayDate = new Date();

  // Yesterday check
  const yesterday = new Date(todayDate);
  yesterday.setDate(yesterday.getDate() - 1);
  if (
    msgDate.getDate() === yesterday.getDate() &&
    msgDate.getMonth() === yesterday.getMonth() &&
    msgDate.getFullYear() === yesterday.getFullYear()
  ) {
    return 'Yesterday';
  }

  const sameYear = msgDate.getFullYear() === todayDate.getFullYear();
  const monthShort = msgDate.toLocaleString('en-US', { month: 'short' });
  const day = msgDate.getDate();

  if (sameYear) {
    return `${monthShort} ${day}`;
  }

  return `${day} ${monthShort} ${msgDate.getFullYear()}`;
}

/**
 * Full readable time for tooltip:
 * "Today at 2:45 PM" or "Sep 30 at 11:20 AM"
 */
export function formatFullTime(timestamp) {
  if (!timestamp) return '';
  const t = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime();
  const d = new Date(t);
  const now = new Date();

  const timeStr = d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const diffDays = Math.round((todayDate - msgDay) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return `Today at ${timeStr}`;
  if (diffDays === 1) return `Yesterday at ${timeStr}`;

  const dateStr = d.toLocaleString('en-US', { month: 'short', day: 'numeric' });
  return `${dateStr} at ${timeStr}`;
}

/**
 * Seen receipt: "Seen · 2:45 PM" or "Seen · 2m ago"
 */
export function formatSeenStatus(seenAt) {
  if (!seenAt) return 'Seen';

  const now = Date.now();
  const t = typeof seenAt === 'number' ? seenAt : new Date(seenAt).getTime();
  const diffMin = Math.floor((now - t) / 60000);

  if (diffMin < 1) return 'Seen · just now';
  if (diffMin < 60) return `Seen · ${diffMin}m ago`;

  const timeStr = new Date(t).toLocaleString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true
  });
  return `Seen · ${timeStr}`;
}

/**
 * Format expiry countdown with smooth display:
 * "30s", "1m 12s", "23h 59m"
 */
export function formatCountdown(expiresAt) {
  if (!expiresAt) return '';
  const now = Date.now();
  const msLeft = Math.max(0, expiresAt - now);
  return formatCountdownMs(msLeft);
}

export function formatCountdownSec(secLeft) {
  if (typeof secLeft !== 'number') return '';
  if (secLeft <= 0) return '0s';
  if (secLeft < 60) return `${secLeft}s`;
  const m = Math.floor(secLeft / 60);
  const s = secLeft % 60;
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
}

function formatCountdownMs(msLeft) {
  const secLeft = Math.ceil(msLeft / 1000);
  return formatCountdownSec(secLeft);
}

/**
 * Session expiration relative label:
 * "Expires in 23h 54m"
 */
export function formatSessionExpiry(expiresAt) {
  if (!expiresAt) return '';
  const ms = Math.max(0, expiresAt - Date.now());
  if (ms === 0) return 'Expired';
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `Expires in ${m}m`;
  return `Expires in ${h}h${m > 0 ? ` ${m}m` : ''}`;
}
