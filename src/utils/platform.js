/**
 * U2U Platform & Environment Detection
 * 
 * Accurately determines supported mobile platforms (Android browsers/PWAs,
 * iOS Safari/PWAs, and iPadOS devices) while strictly excluding desktop browsers.
 * Fails safely by returning false when platform detection is uncertain.
 */

export function isSupportedMobilePlatform() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  // Safe developer/testing hook: allow ?previewBanner=true or window.__PREVIEW_UPDATE_BANNER__
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('previewBanner') === 'true' || window.__PREVIEW_UPDATE_BANNER__ === true) {
      return true;
    }
  } catch {}

  const ua = (navigator.userAgent || '').toLowerCase();
  const platform = (navigator.platform || '').toLowerCase();
  const maxTouchPoints = navigator.maxTouchPoints || 0;

  const clientDataPlatform = (navigator.userAgentData?.platform || '').toLowerCase();

  // 1. Supported Android mobile devices & PWAs
  const isAndroid = /android/i.test(ua) || clientDataPlatform === 'android';
  if (isAndroid && !/iphone|ipad|ipod|cros/i.test(ua)) {
    return true;
  }

  // 2. Explicitly reject desktop platforms
  if (/windows nt|win32|win64/i.test(ua) || /win/i.test(platform)) {
    return false;
  }
  if (/cros/i.test(ua)) {
    return false;
  }
  // Linux desktops (Linux UA without Android)
  if (/linux/i.test(ua) && !/android/i.test(ua)) {
    return false;
  }
  // Traditional desktop macOS (Macintosh without touch points)
  if (/macintosh|mac os x/i.test(ua) && maxTouchPoints <= 1) {
    return false;
  }

  // 3. Supported iOS mobile devices (iPhone, iPod, iPad)
  const isIos = /iphone|ipad|ipod/i.test(ua);
  if (isIos) {
    return true;
  }

  // 4. iPadOS desktop-mode UA (reports 'Macintosh' / 'MacIntel' with multi-touch)
  const isIpadDesktopUA = /macintosh|mac os x/i.test(ua) && maxTouchPoints > 1;
  if (isIpadDesktopUA) {
    return true;
  }

  // Fail safe: reject any unidentified environment
  return false;
}

export function isStandalonePwa() {
  if (typeof window === 'undefined') return false;
  return Boolean(
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator?.standalone === true ||
    (typeof document !== 'undefined' && document.referrer?.includes('android-app://'))
  );
}

/**
 * Detects whether the current device is an Android mobile browser or installed Android PWA.
 * Strictly excludes iOS and desktop devices.
 */
export function isAndroidPlatform() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  // Safe developer/testing hook: allow ?previewAndroidHeader=true or window.__PREVIEW_ANDROID_HEADER__
  try {
    const params = new URLSearchParams(window.location.search);
    const previewParam = params.get('previewAndroidHeader');
    if (previewParam === 'true' || window.__PREVIEW_ANDROID_HEADER__ === true) {
      try { localStorage.setItem('u2u_preview_android_header', 'true'); } catch {}
      try { sessionStorage.setItem('u2u_preview_android_header', 'true'); } catch {}
      return true;
    } else if (previewParam === 'false' || window.__PREVIEW_ANDROID_HEADER__ === false) {
      try { localStorage.removeItem('u2u_preview_android_header'); } catch {}
      try { sessionStorage.removeItem('u2u_preview_android_header'); } catch {}
      return false;
    }
    if (typeof localStorage !== 'undefined' && localStorage.getItem('u2u_preview_android_header') === 'true') {
      return true;
    }
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('u2u_preview_android_header') === 'true') {
      return true;
    }
  } catch {}

  const ua = (navigator.userAgent || '').toLowerCase();
  const platform = (navigator.platform || '').toLowerCase();
  const clientDataPlatform = (navigator.userAgentData?.platform || '').toLowerCase();

  // 1. Android mobile browser, installed Android PWA, or Android DevTools emulation
  const isAndroid = /android/i.test(ua) || clientDataPlatform === 'android';
  if (isAndroid) {
    // Strictly exclude iOS, macOS, and ChromeOS
    if (/iphone|ipad|ipod/i.test(ua) || /cros/i.test(ua)) {
      return false;
    }
    return true;
  }

  // 2. Exclude non-Android platforms
  if (/windows nt|win32|win64/i.test(ua) || /win/i.test(platform)) {
    return false;
  }
  if (/iphone|ipad|ipod/i.test(ua) || /macintosh|mac os x/i.test(ua)) {
    return false;
  }
  if (/cros/i.test(ua)) {
    return false;
  }

  return false;
}

