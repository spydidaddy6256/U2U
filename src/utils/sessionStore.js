/**
 * U2U Ephemeral Session Store
 * 
 * Safely persists temporary session metadata within the current browser/app
 * session context (sessionStorage) to support:
 * - Seamless WebView restoration on Android app resume
 * - In-app navigation between launcher and active chat
 * - Safe recovery from unintentional reloads without erasing active session state
 * 
 * Strict Zero-Knowledge rules:
 * - Plaintext passcodes are NEVER sent to the server.
 * - Expired sessions are automatically discarded and purged.
 */

const ACTIVE_SESSION_KEY = 'u2u_active_session';

export function getStoredActiveSession() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(ACTIVE_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (session && session.sessionId && session.expiresAt && session.expiresAt > Date.now()) {
      return session;
    }
    // Automatically purge if expired
    sessionStorage.removeItem(ACTIVE_SESSION_KEY);
  } catch {}
  return null;
}

export function saveActiveSession(sessionData) {
  if (typeof window === 'undefined' || !sessionData) return;
  try {
    sessionStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify({
      sessionId: sessionData.sessionId,
      passcode: sessionData.passcode,
      expiresAt: sessionData.expiresAt,
      authTicket: sessionData.authTicket || '',
      joinToken: sessionData.joinToken || '',
      view: sessionData.view || 'chat',
      updatedAt: Date.now()
    }));
  } catch {}
}

export function clearActiveSession() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(ACTIVE_SESSION_KEY);
  } catch {}
}
