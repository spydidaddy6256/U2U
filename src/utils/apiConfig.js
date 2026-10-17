import { Capacitor } from '@capacitor/core';

/**
 * U2U Production Endpoint Configuration
 * 
 * Ensures secure HTTPS/WSS communication across both:
 * 1. Native Android App (Capacitor) -> strictly uses production endpoints (https://u2u.onrender.com, wss://u2u.onrender.com/ws)
 * 2. Browser / Web App Mode -> preserves relative paths (/api/...) and origin-based WebSocket routing
 */

export const PRODUCTION_API_ORIGIN = 'https://u2u.onrender.com';
export const PRODUCTION_WS_ORIGIN = 'wss://u2u.onrender.com/ws';

export function isNativeAndroid() {
  if (typeof Capacitor !== 'undefined') {
    try {
      if (typeof Capacitor.isNativePlatform === 'function' && Capacitor.isNativePlatform()) return true;
      if (typeof Capacitor.getPlatform === 'function' && Capacitor.getPlatform() === 'android') return true;
    } catch {}
  }
  if (typeof window !== 'undefined') {
    try {
      if (window.Capacitor?.isNativePlatform?.() || window.Capacitor?.getPlatform?.() === 'android') return true;
      if (window.androidBridge || window.CapacitorCustomPlatform?.name === 'android') return true;
      // In Capacitor WebView on Android with androidScheme: "https", origin is https://localhost
      // whereas in Vite browser dev it is http://localhost:5173 or port 3001
      if (window.location && window.location.hostname === 'localhost' && window.location.protocol === 'https:') {
        if (window.location.port !== '5173' && window.location.port !== '3001') {
          return true;
        }
      }
    } catch {}
  }
  return false;
}

export function getApiBaseUrl() {
  const envUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
                 (typeof process !== 'undefined' && process.env?.VITE_API_BASE_URL);
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }
  if (isNativeAndroid()) {
    return PRODUCTION_API_ORIGIN;
  }
  return '';
}

export function getApiUrl(endpoint) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const base = getApiBaseUrl();
  return base ? `${base}${cleanEndpoint}` : cleanEndpoint;
}

export function getWsUrl() {
  const envWs = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_WS_URL) ||
                (typeof process !== 'undefined' && process.env?.VITE_WS_URL);
  if (envWs) {
    return envWs;
  }
  if (isNativeAndroid()) {
    return PRODUCTION_WS_ORIGIN;
  }
  if (typeof window !== 'undefined' && window.location) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  }
  return PRODUCTION_WS_ORIGIN;
}

/**
 * Resolves the public base origin to use for shareable invite URLs.
 * When running inside the native Android app (Capacitor), the local WebView origin
 * is 'https://localhost', which cannot be opened by external recipients.
 * Invite URLs must strictly use the public deployment domain 'https://u2u.onrender.com'.
 * In standard browser environments, it uses the current window.location.origin.
 */
export function getInviteOrigin() {
  if (isNativeAndroid()) {
    return PRODUCTION_API_ORIGIN;
  }
  if (typeof window !== 'undefined' && window.location) {
    const { origin, hostname, protocol, port } = window.location;
    // Extra safety: if origin is localhost over https with default/empty port (Capacitor WebView)
    if (hostname === 'localhost' && protocol === 'https:' && port !== '5173' && port !== '3001') {
      return PRODUCTION_API_ORIGIN;
    }
    if (origin === 'https://localhost') {
      return PRODUCTION_API_ORIGIN;
    }
    if (origin && origin !== 'null') {
      return origin;
    }
  }
  return PRODUCTION_API_ORIGIN;
}

/**
 * Generates a clean, recipient-ready join invite URL.
 * Format: <origin>/join/<joinToken>#<passcode>
 * 
 * Rules:
 * 1. Under native Android (Capacitor), origin is strictly https://u2u.onrender.com and never https://localhost.
 * 2. In browser mode, preserves the current origin (e.g. https://u2u.onrender.com or local dev origin).
 * 3. Preserves the join token and the required URL fragment (#passcode).
 * 4. Internal preview parameters like ?previewAndroidHeader=true are stripped from public invite links.
 */
export function generateInviteUrl(joinToken, passcode, options = {}) {
  if (!joinToken) return '';
  const origin = getInviteOrigin();
  const hash = passcode ? `#${encodeURIComponent(passcode)}` : '';
  
  // Only include preview query parameter if explicitly requested (e.g. dev/testing)
  const query = options?.previewAndroidHeader ? '?previewAndroidHeader=true' : '';
  
  return `${origin}/join/${joinToken}${query}${hash}`;
}

