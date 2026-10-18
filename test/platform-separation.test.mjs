import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function runPlatformSeparationTests() {
  console.log('================================================================');
  console.log('   U2U PLATFORM SEPARATION & APP ARCHITECTURE VERIFICATION     ');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // Read source files for structural verification
    const appJsxPath = path.join(rootDir, 'src/App.jsx');
    const landingViewPath = path.join(rootDir, 'src/components/LandingView.jsx');
    const nativeLauncherPath = path.join(rootDir, 'src/components/NativeAppLauncher.jsx');
    const headerPath = path.join(rootDir, 'src/components/Header.jsx');
    const indexCssPath = path.join(rootDir, 'src/index.css');
    const appCssPath = path.join(rootDir, 'src/App.css');
    const capConfigPath = path.join(rootDir, 'capacitor.config.json');

    assert(fs.existsSync(appJsxPath), 'src/App.jsx exists');
    assert(fs.existsSync(landingViewPath), 'src/components/LandingView.jsx exists');
    assert(fs.existsSync(nativeLauncherPath), 'src/components/NativeAppLauncher.jsx exists');
    assert(fs.existsSync(headerPath), 'src/components/Header.jsx exists');

    const appJsx = fs.readFileSync(appJsxPath, 'utf8');
    const landingView = fs.readFileSync(landingViewPath, 'utf8');
    const nativeLauncher = fs.readFileSync(nativeLauncherPath, 'utf8');
    const header = fs.readFileSync(headerPath, 'utf8');
    const indexCss = fs.readFileSync(indexCssPath, 'utf8');
    const appCss = fs.readFileSync(appCssPath, 'utf8');
    const capConfig = JSON.parse(fs.readFileSync(capConfigPath, 'utf8'));

    // ─────────────────────────────────────────────────────────────
    // 1. Desktop Browser Renders the Marketing Website
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 1. Desktop Browser Experience ---');

    const { isNativeAndroid } = await import('../src/utils/apiConfig.js');
    const { canAccessWebChat, setDesktopOverride } = await import('../src/utils/platformRouting.js');

    // Mock sessionStorage
    const storageStore = new Map();
    globalThis.sessionStorage = {
      getItem: (key) => storageStore.get(key) || null,
      setItem: (key, val) => storageStore.set(key, String(val)),
      removeItem: (key) => storageStore.delete(key),
      clear: () => storageStore.clear()
    };

    const setMockNavigator = (navObj) => {
      Object.defineProperty(globalThis, 'navigator', {
        value: navObj,
        configurable: true,
        writable: true
      });
    };

    // Simulate standard desktop browser environment
    globalThis.window = {
      location: {
        origin: 'https://u2u.onrender.com',
        hostname: 'u2u.onrender.com',
        protocol: 'https:',
        pathname: '/',
        hash: '',
        port: ''
      }
    };
    setMockNavigator({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      platform: 'Win32',
      maxTouchPoints: 0
    });

    assert(isNativeAndroid() === false, 'Desktop browser is strictly NOT detected as native Android');
    assert(canAccessWebChat() === true, 'Desktop browser has full access to web chat and sessions');

    // Verify marketing website content in LandingView
    assert(landingView.includes('className="site-nav'), 'LandingView contains website navigation header (site-nav)');
    assert(landingView.includes('className="hero-section"'), 'LandingView contains marketing hero section');
    assert(landingView.includes('id="features"'), 'LandingView contains Features section (#features)');
    assert(landingView.includes('id="how-it-works"'), 'LandingView contains How It Works section (#how-it-works)');
    assert(landingView.includes('id="privacy-design"'), 'LandingView contains Privacy section (#privacy-design)');
    assert(landingView.includes('id="temp-vs-perm"'), 'LandingView contains Comparison section (#temp-vs-perm)');
    assert(landingView.includes('id="faq"'), 'LandingView contains FAQ section (#faq)');
    assert(landingView.includes('className="site-footer"'), 'LandingView contains marketing footer');

    // Header exclusivity on desktop landing: Header.jsx is NOT rendered on view === 'landing'
    assert(appJsx.includes("view !== 'landing' && (") && appJsx.includes('<Header'),
      'App.jsx conditionally guards Header: Header is NOT rendered when view === "landing"');

    // ─────────────────────────────────────────────────────────────
    // 2. Android Chrome Renders Mobile Website / Install Experience
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 2. Android Chrome Mobile Browser Experience ---');

    // Simulate Android Chrome browser (mobile UA, but NOT native Capacitor app)
    setMockNavigator({
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.119 Mobile Safari/537.36',
      platform: 'Linux armv8l',
      maxTouchPoints: 5,
      userAgentData: { platform: 'Android' }
    });

    assert(isNativeAndroid() === false, 'Android Chrome browser is NOT detected as native Capacitor app');
    assert(canAccessWebChat() === false, 'Android Chrome restricts raw mobile web chat without native hardware security by default');

    // Verify desktop override functionality for mobile browsers
    setDesktopOverride(true);
    assert(canAccessWebChat() === true, 'Android Chrome respects explicit desktop mode override');
    setDesktopOverride(false);
    assert(canAccessWebChat() === false, 'Android Chrome reverts to mobile restriction when override is removed');

    // App handoff on mobile invite URLs
    assert(appJsx.includes("if (!isNative && !canAccessWebChat())") && appJsx.includes("return 'mobile-handoff'"),
      'Mobile browser routes invite links to mobile-handoff for app installation guidance');

    // ─────────────────────────────────────────────────────────────
    // 3. Native Android Renders App Shell, NOT Marketing Landing Page
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 3. Native Android App Shell Entry Point ---');

    // Simulate Native Android Capacitor App environment
    globalThis.window = {
      location: {
        origin: 'https://localhost',
        hostname: 'localhost',
        protocol: 'https:',
        pathname: '/',
        hash: '',
        port: ''
      },
      Capacitor: {
        isNativePlatform: () => true,
        getPlatform: () => 'android'
      }
    };

    assert(isNativeAndroid() === true, 'Native Capacitor Android app correctly detected via isNativeAndroid()');
    assert(canAccessWebChat() === true, 'Native Android app has full native access to chat features');

    // Verify App.jsx entry point routing:
    // Native app resolves default view to 'app-launcher', NOT 'landing'
    assert(appJsx.includes("return isNative ? 'app-launcher' : 'landing'"),
      'App.jsx resolves initial view to "app-launcher" for native Android, "landing" for web');

    // Verify NativeAppLauncher is rendered in place of LandingView
    assert(appJsx.includes("view === 'app-launcher' && (") && appJsx.includes('<NativeAppLauncher'),
      'App.jsx renders NativeAppLauncher component when view === "app-launcher"');

    // Verify LandingView is strictly guarded for web landing only
    assert(appJsx.includes("view === 'landing' && (") && appJsx.includes('<LandingView'),
      'App.jsx strictly renders LandingView only when view === "landing"');

    // ─────────────────────────────────────────────────────────────
    // 4. Native Android Does NOT Render Website-Only Elements
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 4. Verification of Website-Only Element Exclusion ---');

    // Check that NativeAppLauncher DOES NOT contain marketing sections
    assert(!nativeLauncher.includes('className="hero-section"'), 'NativeAppLauncher does NOT contain marketing hero');
    assert(!nativeLauncher.includes('className="site-nav'), 'NativeAppLauncher does NOT contain website navigation');
    assert(!nativeLauncher.includes('id="features"') && !nativeLauncher.includes('className="features-grid"'),
      'NativeAppLauncher does NOT contain features section');
    assert(!nativeLauncher.includes('id="how-it-works"'), 'NativeAppLauncher does NOT contain How It Works section');
    assert(!nativeLauncher.includes('id="privacy-design"'), 'NativeAppLauncher does NOT contain privacy marketing breakdown');
    assert(!nativeLauncher.includes('id="temp-vs-perm"'), 'NativeAppLauncher does NOT contain comparison marketing cards');
    assert(!nativeLauncher.includes('id="faq"'), 'NativeAppLauncher does NOT contain website FAQ');
    assert(!nativeLauncher.includes('className="site-footer"'), 'NativeAppLauncher does NOT contain marketing footer');

    // Check that NativeAppLauncher DOES contain dedicated app launcher features
    assert(nativeLauncher.includes('data-testid="native-app-launcher"'), 'NativeAppLauncher defines native app launcher container');
    assert(nativeLauncher.includes('Start Temporary Session'), 'NativeAppLauncher provides Start Temporary Session action');
    assert(nativeLauncher.includes('Join a Session'), 'NativeAppLauncher provides Join a Session action');
    assert(nativeLauncher.includes('Permanent Profile'), 'NativeAppLauncher provides Permanent Profile creation/management');
    assert(nativeLauncher.includes('native-profile-card'), 'NativeAppLauncher provides dedicated profile identity card');
    assert(nativeLauncher.includes('native-security-strip'), 'NativeAppLauncher displays zero-knowledge security trust indicators');

    // ─────────────────────────────────────────────────────────────
    // 5. Active Native Session Restoration
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 5. Active Session Restoration Verification ---');

    const { getStoredActiveSession, saveActiveSession, clearActiveSession } = await import('../src/utils/sessionStore.js');

    // Reset mocked sessionStorage
    storageStore.clear();
    globalThis.sessionStorage = {
      getItem: (key) => storageStore.get(key) || null,
      setItem: (key, val) => storageStore.set(key, String(val)),
      removeItem: (key) => storageStore.delete(key),
      clear: () => storageStore.clear()
    };

    // Test saving active session
    const testSession = {
      sessionId: 'TEST-1234-AB',
      passcode: '889900',
      expiresAt: Date.now() + 86400000,
      authTicket: 'ticket-xyz-123',
      joinToken: 'tok-abc',
      view: 'chat'
    };
    saveActiveSession(testSession);

    const restored = getStoredActiveSession();
    assert(restored !== null, 'getStoredActiveSession() retrieves stored active session');
    assert(restored?.sessionId === 'TEST-1234-AB', 'Restored session ID matches');
    assert(restored?.passcode === '889900', 'Restored passcode matches');
    assert(restored?.view === 'chat', 'Restored view is "chat"');

    // Test expired session auto-purge
    const expiredSession = {
      sessionId: 'EXP-1234-CD',
      passcode: '112233',
      expiresAt: Date.now() - 5000, // already expired
      authTicket: 'ticket-expired',
      view: 'chat'
    };
    saveActiveSession(expiredSession);
    const expiredResult = getStoredActiveSession();
    assert(expiredResult === null, 'Expired session is automatically purged and returns null');

    // Test clearActiveSession
    saveActiveSession(testSession);
    clearActiveSession();
    assert(getStoredActiveSession() === null, 'clearActiveSession() completely clears stored session');

    // Verify App.jsx restores active unexpired session on launch
    assert(appJsx.includes('if (initialSession && initialSession.sessionId && initialSession.expiresAt > Date.now())'),
      'App.jsx checks initialSession and restores active view when valid');
    assert(appJsx.includes('deriveKey(passcode, sessionId)'),
      'App.jsx derives cryptoKey on session restoration without user re-entry');
    assert(appJsx.includes('activeSession={sessionId && expiresAt ? { sessionId, expiresAt'),
      'App.jsx passes active session to NativeAppLauncher for quick resume');
    assert(nativeLauncher.includes('data-testid="active-session-card"'),
      'NativeAppLauncher renders active session resume card when session is in progress');

    // ─────────────────────────────────────────────────────────────
    // 6. Native Invite Deep Links Open Correct Join Flow
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 6. Native Invite Deep Link Routing ---');

    // Verify deep link parser extracts token and fragment passcode
    assert(appJsx.includes("urlStr.match(/\\/join\\/([a-zA-Z0-9_-]+)/)"),
      'App.jsx parses /join/:token from deep link URL');
    assert(appJsx.includes("urlStr.match(/#([a-zA-Z0-9_-]+)/)"),
      'App.jsx securely preserves passcode fragment from deep link');
    assert(appJsx.includes("setView('join-link')"),
      'App.jsx transitions directly to join-link flow upon receiving invite deep link');

    // ─────────────────────────────────────────────────────────────
    // 7. Single App-Owned Header in Native App & Website
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 7. Single Header & No Duplicate Branding ---');

    // Exactly one header in native app:
    // When view === 'app-launcher', App.jsx renders Header.jsx, and NativeAppLauncher does NOT render site-nav.
    assert(!nativeLauncher.includes('<header') && !nativeLauncher.includes('<nav'),
      'NativeAppLauncher contains NO header or nav elements');
    assert(header.includes("'u2u-header'") && header.includes('className={headerClass}'), 'Header.jsx defines single app-owned .u2u-header');
    assert(landingView.includes('className="site-nav'), 'LandingView defines website .site-nav');

    // Exactly one header on website landing:
    // When view === 'landing', Header.jsx is omitted, so only LandingView site-nav renders.
    assert(appJsx.includes("view !== 'landing' && (") && appJsx.includes('<Header'),
      'Header is never rendered when LandingView is displayed (no duplicate headers)');

    // ─────────────────────────────────────────────────────────────
    // 8. Status-Bar Spacing & System Bar Preservation
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 8. Status-Bar & Safe-Area Spacing ---');

    // Verify safe-area-inset-top on .u2u-header
    assert(indexCss.includes('.u2u-header') && indexCss.includes('padding-top: env(safe-area-inset-top, 0px)'),
      'src/index.css includes safe-area-inset-top padding on .u2u-header');
    assert(appCss.includes('.u2u-header') && appCss.includes('padding-top: env(safe-area-inset-top, 0px)'),
      'src/App.css includes safe-area-inset-top padding on .u2u-header');

    // Verify StatusBar plugin configuration in capacitor.config.json
    assert(capConfig.plugins?.StatusBar?.style === 'DARK', 'Capacitor StatusBar style configured as DARK');
    assert(capConfig.plugins?.StatusBar?.backgroundColor === '#0e0f12', 'Capacitor StatusBar background set to #0e0f12');

    // Cleanup globals
    delete globalThis.window;
    try { delete globalThis.navigator; } catch {}
    delete globalThis.sessionStorage;

  } catch (err) {
    console.error('Fatal error in platform separation tests:', err);
    failed++;
  }

  console.log('\n================================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPlatformSeparationTests();
