import { PRODUCTION_API_ORIGIN, getInviteOrigin } from './apiConfig.js';

/**
 * Sanitizes user input by stripping invisible control characters, zero-width spaces,
 * and trimming leading/trailing whitespace and newlines.
 */
export function sanitizeInput(raw) {
  if (typeof raw !== 'string') return '';
  let clean = '';
  for (let i = 0; i < raw.length; i++) {
    const code = raw.charCodeAt(i);
    if ((code >= 0 && code <= 31) || (code >= 127 && code <= 159)) continue;
    if (code >= 0x200B && code <= 0x200D) continue;
    if (code === 0xFEFF || (code >= 0x200E && code <= 0x200F) || (code >= 0x202A && code <= 0x202E)) continue;
    clean += raw[i];
  }
  return clean.trim();
}

/**
 * Validates whether text matches the app's standard Session ID format (e.g. 7K4M-X92P-Q8).
 */
export function isSessionId(str) {
  if (typeof str !== 'string') return false;
  const s = str.trim();
  return /^[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{2}$/.test(s) || /^[A-Za-z0-9]{10}$/.test(s);
}

/**
 * Checks whether the origin of a parsed URL is an allowed U2U invite origin.
 */
export function isAllowedOrigin(urlObj) {
  if (urlObj.protocol === 'u2u:') return true;
  if (urlObj.protocol !== 'https:' && urlObj.protocol !== 'http:') return false;

  if (urlObj.origin === PRODUCTION_API_ORIGIN || urlObj.hostname === 'u2u.onrender.com') {
    return true;
  }

  try {
    const inviteOrigin = getInviteOrigin();
    if (inviteOrigin && new URL(inviteOrigin).origin === urlObj.origin) {
      return true;
    }
  } catch {}

  const isDev = Boolean(
    (typeof import.meta !== 'undefined' && import.meta.env?.DEV) ||
    (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
  );

  if (isDev && (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1')) {
    return true;
  }

  return false;
}

/**
 * Parses user input from the quick-join search pill.
 * Returns:
 * - { type: 'empty' } if input is empty
 * - { type: 'session-id', sessionId: string } if input matches bare Session ID format
 * - { type: 'invite', token: string, passcode: string } if input is a valid invite URL
 * - { type: 'invalid' } if input is invalid
 */
export function parseQuickJoinInput(rawInput) {
  const cleaned = sanitizeInput(rawInput);
  if (!cleaned) {
    return { type: 'empty' };
  }

  // 1. Check bare Session ID format
  if (isSessionId(cleaned)) {
    return {
      type: 'session-id',
      sessionId: cleaned.toUpperCase()
    };
  }

  // 2. Reject hazardous protocols directly
  const lower = cleaned.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:') || lower.startsWith('file:')) {
    return { type: 'invalid' };
  }

  // 3. Must be a URL starting with https://, http://, or u2u:// (or u2u:/)
  let parsedUrl;
  try {
    parsedUrl = new URL(cleaned);
  } catch {
    return { type: 'invalid' };
  }

  // 4. Verify allowed origin
  if (!isAllowedOrigin(parsedUrl)) {
    return { type: 'invalid' };
  }

  // 5. Reject if passcode is in query string (security vulnerability)
  if (parsedUrl.search) {
    const searchLower = parsedUrl.search.toLowerCase();
    if (
      parsedUrl.searchParams.has('passcode') ||
      parsedUrl.searchParams.has('pass') ||
      parsedUrl.searchParams.has('code') ||
      parsedUrl.searchParams.has('key') ||
      parsedUrl.searchParams.has('secret') ||
      parsedUrl.searchParams.has('password') ||
      searchLower.includes('passcode=') ||
      searchLower.includes('pass=') ||
      searchLower.includes('code=') ||
      searchLower.includes('p=')
    ) {
      return { type: 'invalid' };
    }
  }

  // 6. Extract token: reuse the same logic /join/([a-zA-Z0-9_-]+)
  // For u2u://join/<token>, hostname is 'join' and pathname is '/<token>'
  const fullPath = parsedUrl.protocol === 'u2u:' && parsedUrl.hostname === 'join'
    ? `/join${parsedUrl.pathname}`
    : parsedUrl.pathname;

  const tokenMatch = fullPath.match(/\/join\/([a-zA-Z0-9_-]+)/);
  if (!tokenMatch || !tokenMatch[1]) {
    return { type: 'invalid' };
  }
  const token = tokenMatch[1];

  // 7. Extract passcode from fragment (#fragment)
  let passcode = '';
  if (parsedUrl.hash) {
    const rawHash = parsedUrl.hash.replace(/^#/, '');
    try {
      passcode = decodeURIComponent(rawHash).trim();
    } catch {
      passcode = rawHash.trim();
    }
  }

  return {
    type: 'invite',
    token,
    passcode
  };
}
