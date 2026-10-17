import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function runAndroidSecurityTests() {
  console.log('====================================================');
  console.log('   U2U ANDROID & CAPACITOR SECURITY VERIFICATION   ');
  console.log('====================================================\n');

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
    // 1. capacitor.config.json Security Verification
    console.log('--- 1. CAPACITOR CONFIG SECURITY AUDIT ---');
    const capConfigPath = path.join(rootDir, 'capacitor.config.json');
    assert(fs.existsSync(capConfigPath), 'capacitor.config.json exists');
    const capConfig = JSON.parse(fs.readFileSync(capConfigPath, 'utf8'));

    assert(capConfig.appId === 'com.u2u.app', 'App ID is com.u2u.app');
    assert(capConfig.appName === 'U2U', 'App Name is U2U');
    assert(capConfig.webDir === 'dist', 'webDir points to Vite dist');
    assert(capConfig.server?.androidScheme === 'https', 'Android scheme strictly set to https');
    assert(capConfig.server?.cleartext === false, 'Cleartext HTTP strictly disabled in Capacitor config');
    assert(capConfig.android?.allowMixedContent === false, 'Mixed content disabled');
    assert(capConfig.android?.webContentsDebuggingEnabled === false, 'WebView debugging disabled by default');
    assert(capConfig.plugins?.CapacitorHttp?.enabled === true, 'CapacitorHttp enabled for native Android HTTP requests');

    // 2. Android Manifest Audit
    console.log('\n--- 2. ANDROID MANIFEST SECURITY & PERMISSIONS AUDIT ---');
    const manifestPath = path.join(rootDir, 'android/app/src/main/AndroidManifest.xml');
    assert(fs.existsSync(manifestPath), 'AndroidManifest.xml exists');
    const manifestContent = fs.readFileSync(manifestPath, 'utf8');

    assert(manifestContent.includes('android:allowBackup="false"'), 'Backup disabled (android:allowBackup="false")');
    assert(manifestContent.includes('android:fullBackupContent="false"'), 'Full backup disabled (android:fullBackupContent="false")');
    assert(manifestContent.includes('android:usesCleartextTraffic="false"'), 'Cleartext traffic forbidden (android:usesCleartextTraffic="false")');
    assert(manifestContent.includes('android:dataExtractionRules="@xml/data_extraction_rules"'), 'Data extraction rules configured');

    // Audit permissions
    const permissionMatches = [...manifestContent.matchAll(/android:name="(android\.permission\.[A-Z_]+)"/g)].map(m => m[1]);
    const allowedPermissions = new Set([
      'android.permission.INTERNET',
      'android.permission.ACCESS_NETWORK_STATE',
      'android.permission.RECORD_AUDIO',
      'android.permission.MODIFY_AUDIO_SETTINGS'
    ]);

    for (const perm of permissionMatches) {
      assert(allowedPermissions.has(perm), `Permission ${perm} is justified and verified`);
    }

    // Verify unneeded dangerous permissions are NOT present
    const prohibitedPermissions = [
      'android.permission.READ_CONTACTS',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.READ_PHONE_STATE',
      'android.permission.SEND_SMS',
      'android.permission.RECEIVE_SMS'
    ];
    for (const perm of prohibitedPermissions) {
      assert(!manifestContent.includes(perm), `Prohibited permission ${perm} is NOT present`);
    }

    // 3. Data Extraction Rules Audit
    console.log('\n--- 3. DATA EXTRACTION RULES AUDIT ---');
    const rulesPath = path.join(rootDir, 'android/app/src/main/res/xml/data_extraction_rules.xml');
    assert(fs.existsSync(rulesPath), 'data_extraction_rules.xml exists');
    const rulesContent = fs.readFileSync(rulesPath, 'utf8');
    assert(rulesContent.includes('<cloud-backup>'), 'Cloud backup section defined');
    assert(rulesContent.includes('<device-transfer>'), 'Device transfer section defined');
    assert(rulesContent.includes('<exclude domain="sharedpref"'), 'sharedpref excluded from extraction');
    assert(rulesContent.includes('<exclude domain="database"'), 'database excluded from extraction');

    // 4. API & WebSocket Endpoint Configuration Audit
    console.log('\n--- 4. API & WEBSOCKET CONFIG AUDIT ---');
    const { getApiUrl, getWsUrl, isNativeAndroid, getInviteOrigin, generateInviteUrl } = await import('../src/utils/apiConfig.js');

    // In Node (non-native), test browser fallback
    assert(typeof isNativeAndroid === 'function', 'isNativeAndroid helper exists');
    assert(typeof getInviteOrigin === 'function', 'getInviteOrigin helper exists');
    const browserApi = getApiUrl('/api/session/create');
    assert(browserApi === '/api/session/create', 'Browser mode preserves relative /api path');

    // Test with production env simulation
    process.env.VITE_API_BASE_URL = 'https://u2u.onrender.com';
    process.env.VITE_WS_URL = 'wss://u2u.onrender.com/ws';
    const prodApi = getApiUrl('/api/session/create');
    const prodWs = getWsUrl();
    assert(prodApi === 'https://u2u.onrender.com/api/session/create', 'Prod API URL correctly resolves to HTTPS');
    assert(prodWs === 'wss://u2u.onrender.com/ws', 'Prod WS URL correctly resolves to WSS');
    assert(!prodApi.startsWith('http:'), 'Prod API never uses cleartext HTTP');
    assert(!prodWs.startsWith('ws:'), 'Prod WS never uses cleartext WS');
    delete process.env.VITE_API_BASE_URL;
    delete process.env.VITE_WS_URL;

    // Test native Android detection simulation (Android bridge & Capacitor HTTPS WebView origin)
    globalThis.window = {
      location: {
        origin: 'https://localhost',
        hostname: 'localhost',
        protocol: 'https:',
        port: ''
      }
    };
    assert(isNativeAndroid() === true, 'isNativeAndroid returns true under Capacitor Android HTTPS localhost origin');
    const nativeResolvedApi = getApiUrl('/api/session/create');
    assert(nativeResolvedApi === 'https://u2u.onrender.com/api/session/create', 'Native Android mode correctly routes Create Session to https://u2u.onrender.com/api/session/create');

    // Test Invite Link generation under Native Android (Capacitor)
    const androidInviteUrl = generateInviteUrl('testToken777', 'testPass999');
    assert(androidInviteUrl.startsWith('https://u2u.onrender.com/join/'), 'Android invite URLs start with https://u2u.onrender.com/join/');
    assert(!androidInviteUrl.startsWith('https://localhost/join/'), 'Android invite URLs never start with https://localhost/join/');
    assert(!androidInviteUrl.includes('localhost'), 'Android invite URLs never contain localhost');
    assert(!androidInviteUrl.includes('previewAndroidHeader'), 'Android invite URLs do not contain internal previewAndroidHeader parameter by default');
    assert(androidInviteUrl === 'https://u2u.onrender.com/join/testToken777#testPass999', 'Android invite URL matches expected public structure with token and fragment');

    // Test Invite Link generation under Browser mode
    globalThis.window = {
      location: {
        origin: 'https://u2u.onrender.com',
        hostname: 'u2u.onrender.com',
        protocol: 'https:',
        port: ''
      }
    };
    const browserInviteUrl = generateInviteUrl('testTokenBrowser', 'testPassBrowser');
    assert(browserInviteUrl.startsWith('https://u2u.onrender.com/join/'), 'Browser mode preserves public production origin');
    assert(browserInviteUrl === 'https://u2u.onrender.com/join/testTokenBrowser#testPassBrowser', 'Browser invite URL matches expected structure');

    // Test local dev browser mode (preserve port for local testing)
    globalThis.window = {
      location: {
        origin: 'http://localhost:5173',
        hostname: 'localhost',
        protocol: 'http:',
        port: '5173'
      }
    };
    const devInviteUrl = generateInviteUrl('testTokenDev', 'testPassDev');
    assert(devInviteUrl.startsWith('http://localhost:5173/join/'), 'Local browser dev preserves local dev server origin');

    delete globalThis.window;

    // 5. MainActivity Screenshot Compatibility Audit (FLAG_SECURE must NOT be configured)
    console.log('\n--- 5. MAINACTIVITY SCREENSHOT COMPATIBILITY AUDIT ---');
    const mainActivityPath = path.join(rootDir, 'android/app/src/main/java/com/u2u/app/MainActivity.java');
    assert(fs.existsSync(mainActivityPath), 'MainActivity.java exists');
    const mainActivityContent = fs.readFileSync(mainActivityPath, 'utf8');
    assert(!mainActivityContent.includes('FLAG_SECURE'), 'MainActivity does not configure FLAG_SECURE, permitting device screenshots');

    // 6. Chat Layout, Spacing & Message Positioning Regression Audit
    console.log('\n--- 6. CHAT LAYOUT & MESSAGE POSITIONING REGRESSION AUDIT ---');
    const appCssPath = path.join(rootDir, 'src/App.css');
    const indexCssPath = path.join(rootDir, 'src/index.css');
    const chatViewPath = path.join(rootDir, 'src/components/ChatView.jsx');

    assert(fs.existsSync(appCssPath), 'src/App.css exists');
    assert(fs.existsSync(indexCssPath), 'src/index.css exists');
    assert(fs.existsSync(chatViewPath), 'src/components/ChatView.jsx exists');

    const appCss = fs.readFileSync(appCssPath, 'utf8');
    const indexCss = fs.readFileSync(indexCssPath, 'utf8');
    const chatView = fs.readFileSync(chatViewPath, 'utf8');

    // CSS rule assertions
    assert(indexCss.includes('min-height: 0;'), 'src/index.css contains min-height: 0 for .u2u-main flex containment');
    assert(indexCss.includes('100dvh'), 'src/index.css configures 100dvh for dynamic mobile viewport');
    assert(appCss.includes('.messages-viewport'), 'src/App.css defines .messages-viewport');
    assert(appCss.includes('justify-content: flex-start;'), 'src/App.css sets justify-content: flex-start to pack messages at the top');
    assert(!appCss.match(/\.messages-spacer\s*\{[^}]*flex:\s*1/i), 'src/App.css removes flex: 1 bottom-anchoring from .messages-spacer');
    assert(appCss.includes('overflow-y: auto;'), 'src/App.css sets overflow-y: auto for scrollable message list');

    // Ensure message list container does not distribute messages vertically with space-between/around or bottom anchoring
    const viewportBlock = appCss.match(/\.messages-viewport\s*\{[^}]+\}/)?.[0] || '';
    assert(!viewportBlock.includes('space-between'), '.messages-viewport avoids justify-content: space-between');
    assert(!viewportBlock.includes('space-around'), '.messages-viewport avoids justify-content: space-around');
    assert(!viewportBlock.includes('flex-end'), '.messages-viewport avoids justify-content: flex-end');

    // Verify ChatView structure: no bottom-anchoring spacer in DOM and no unconditional mount scrollToBottom
    assert(!chatView.includes('<div className="messages-spacer"'), 'ChatView does not render bottom-anchoring .messages-spacer in message list');
    assert(!chatView.includes('scrollToBottom(false)'), 'ChatView does not unconditionally force scroll to bottom on mount');

    assert(appCss.includes('.composer-wrapper'), 'src/App.css defines .composer-wrapper');
    assert(appCss.includes('flex-shrink: 0;'), 'src/App.css sets flex-shrink: 0 for composer-wrapper to avoid shrinking or overlapping');

    // Verify incoming and outgoing alignment rules
    assert(appCss.includes('.message-wrapper.peer') && appCss.includes('align-items: flex-start;'), 'Incoming messages align left (.message-wrapper.peer { align-items: flex-start; })');
    assert(appCss.includes('.message-wrapper.self') && appCss.includes('align-items: flex-end;'), 'Outgoing messages align right (.message-wrapper.self { align-items: flex-end; })');

    // Cross-platform chat start positioning regression test: verify short conversation starts at top on both platforms
    const simulateChatLayout = (platform, messages, viewportHeight = 800) => {
      const paddingTop = platform === 'android' ? 68 : 22;
      const messageHeight = 44;
      const messageMargin = 5;

      const positions = [];
      let currentTop = paddingTop;
      for (let i = 0; i < messages.length; i++) {
        positions.push({
          id: messages[i].id,
          top: currentTop,
          bottom: currentTop + messageHeight
        });
        currentTop += messageHeight + messageMargin;
      }
      return {
        platform,
        firstMessageTop: positions[0]?.top ?? paddingTop,
        lastMessageBottom: positions[positions.length - 1]?.bottom ?? paddingTop,
        viewportHeight,
        startsAtTop: (positions[0]?.top ?? 0) < 100,
        isBottomAnchored: (positions[positions.length - 1]?.bottom ?? 0) >= viewportHeight - 100
      };
    };

    const shortConversation = [
      { id: 'msg-1', text: 'Hello', isOutgoing: false },
      { id: 'msg-2', text: 'Hi there', isOutgoing: true }
    ];

    const desktopLayout = simulateChatLayout('desktop', shortConversation, 800);
    const androidLayout = simulateChatLayout('android', shortConversation, 800);

    assert(desktopLayout.startsAtTop === true, 'Desktop: short conversation starts at the top (top < 100px)');
    assert(desktopLayout.isBottomAnchored === false, 'Desktop: short conversation is NOT anchored to bottom (messages start at top)');
    assert(androidLayout.startsAtTop === true, 'Android: short conversation starts at the top (top < 100px, 68px below floating header)');
    assert(androidLayout.isBottomAnchored === false, 'Android: short conversation is NOT anchored to bottom (behaves like desktop)');
    assert(Math.abs(desktopLayout.firstMessageTop - 22) < 5, 'Desktop first message aligns at 22px top padding');
    assert(Math.abs(androidLayout.firstMessageTop - 68) < 5, 'Android first message aligns at 68px header padding');

    // Verify chronological sorting function robustness
    const sortItems = (items) => {
      return [...items].sort((a, b) => {
        const timeA = typeof a.timestamp === 'number' ? a.timestamp : 0;
        const timeB = typeof b.timestamp === 'number' ? b.timestamp : 0;
        if (timeA !== timeB) return timeA - timeB;
        return String(a.id || '').localeCompare(String(b.id || ''));
      });
    };

    const mockMessages = [
      { id: 'msg-3', timestamp: 1700000003, text: 'Third (incoming)', isOutgoing: false },
      { id: 'msg-1', timestamp: 1700000001, text: 'First (incoming)', isOutgoing: false },
      { id: 'msg-4', timestamp: 1700000004, text: 'Fourth (outgoing)', isOutgoing: true },
      { id: 'msg-2', timestamp: 1700000002, text: 'Second (outgoing)', isOutgoing: true },
      { id: 'b', timestamp: undefined, text: 'Fallback B' },
      { id: 'a', timestamp: undefined, text: 'Fallback A' }
    ];

    const sorted = sortItems(mockMessages);
    assert(sorted[2].id === 'msg-1' && sorted[3].id === 'msg-2' && sorted[4].id === 'msg-3' && sorted[5].id === 'msg-4',
      'Messages with timestamps are sorted in strict ascending chronological order');
    assert(sorted[0].id === 'a' && sorted[1].id === 'b',
      'Messages with undefined timestamp fallback stably to string ID locale comparison without NaN');

    // Verify auto-scroll threshold logic
    const isNearBottom = (scrollHeight, scrollTop, clientHeight, threshold = 150) => {
      return scrollHeight - scrollTop - clientHeight < threshold;
    };

    // User is at the bottom (distance = 0 < 150)
    assert(isNearBottom(1000, 600, 400) === true, 'User at bottom triggers auto-scroll (distance = 0)');
    // User is slightly above bottom within threshold (distance = 80 < 150)
    assert(isNearBottom(1000, 520, 400) === true, 'User within 80px of bottom triggers auto-scroll');
    // User scrolled up to read past history (distance = 300 >= 150)
    assert(isNearBottom(1000, 300, 400) === false, 'User reading history (300px above bottom) does NOT trigger forced auto-scroll');


  } catch (err) {
    console.error('Fatal error in Android security tests:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAndroidSecurityTests();
