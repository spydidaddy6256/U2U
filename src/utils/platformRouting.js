import { isAndroidPlatform, isSupportedMobilePlatform } from './platform.js';
import { isNativeAndroid } from './apiConfig.js';

/**
 * U2U Platform Routing & App Distribution Configuration
 * 
 * Rules:
 * 1. Desktop browsers can access full web chat, session creation, joining, and profiles.
 * 2. The native Android app (Capacitor) can access full chat and features.
 * 3. Mobile browsers (Android/iOS) see the public website and app installation guidance.
 *    They are not exposed to normal mobile web chat without native hardware security.
 * 4. Desktop users are never blocked based solely on viewport resizing.
 * 5. App download URL uses a strict configuration placeholder and graceful "coming soon" state.
 *    Never fabricates a download or store URL.
 */

// Production distribution placeholder — set via VITE_ANDROID_DOWNLOAD_URL when published
export const ANDROID_APP_DOWNLOAD_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ANDROID_DOWNLOAD_URL) || '';

export function getAppDistributionConfig() {
  const url = ANDROID_APP_DOWNLOAD_URL.trim();
  return {
    downloadUrl: url,
    isAvailable: Boolean(url),
    statusText: url ? 'Download U2U for Android' : 'Android App Coming Soon',
    versionText: 'v1.0.0 (Encrypted Build)'
  };
}

/**
 * Checks if the current user can access the full chat application:
 * - Desktop browsers (Windows, Mac, Linux, ChromeOS)
 * - Native Android Capacitor App (isNativeAndroid() is true)
 * - Manual desktop fallback override if requested
 */
export function canAccessWebChat() {
  // If running inside the native Capacitor Android app, chat is always permitted
  if (isNativeAndroid()) {
    return true;
  }

  // Check manual desktop mode override for tablets or users requesting desktop experience
  if (typeof window !== 'undefined') {
    try {
      if (sessionStorage.getItem('u2u_desktop_override') === 'true' ||
          localStorage.getItem('u2u_desktop_override') === 'true') {
        return true;
      }
    } catch {}
  }

  // If this is a mobile browser (Android or iOS), mobile web chat is restricted
  if (isSupportedMobilePlatform() || isAndroidPlatform()) {
    return false;
  }

  // Otherwise, standard desktop browser
  return true;
}

/**
 * Sets user desktop override for power users or tablet desktop browsers
 */
export function setDesktopOverride(enable = true) {
  if (typeof window === 'undefined') return;
  try {
    if (enable) {
      sessionStorage.setItem('u2u_desktop_override', 'true');
    } else {
      sessionStorage.removeItem('u2u_desktop_override');
    }
  } catch {}
}

/**
 * Generates an Android App deep link for seamless handoff to the installed Capacitor app.
 * Preserves the token and #passcode fragment securely.
 * NEVER puts the passcode in query strings or server URLs.
 */
export function generateAppDeepLink(joinToken, passcode) {
  if (!joinToken) return '';
  const hash = passcode ? `#${encodeURIComponent(passcode)}` : '';
  return `u2u://join/${joinToken}${hash}`;
}
