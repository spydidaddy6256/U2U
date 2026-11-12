import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

console.log('====================================================');
console.log('   U2U NATIVE ANDROID FIXES VERIFICATION            ');
console.log('====================================================\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${name}: ${err.message}`);
    failed++;
  }
}

// ─────────────────────────────────────────────────────────────
// 1. PWA INSTALL POPUP REMOVAL IN NATIVE ANDROID
// ─────────────────────────────────────────────────────────────
console.log('--- 1. PWA INSTALL POPUP REMOVAL FROM NATIVE APP ---');

const pwaPromptPath = path.join(ROOT, 'src/components/PwaInstallPrompt.jsx');
const appPath = path.join(ROOT, 'src/App.jsx');
const pwaPromptContent = fs.readFileSync(pwaPromptPath, 'utf8');
const appContent = fs.readFileSync(appPath, 'utf8');

test('PwaInstallPrompt imports isNativeAndroid helper', () => {
  assert(pwaPromptContent.includes("import { isNativeAndroid } from '../utils/apiConfig'"), 'Must import isNativeAndroid');
});

test('PwaInstallPrompt guards useEffect against running in native Android', () => {
  assert(pwaPromptContent.includes('if (isNativeAndroid()) return;'), 'Must abort prompt registration in native Android');
});

test('PwaInstallPrompt returns null when isNativeAndroid() is true', () => {
  assert(pwaPromptContent.includes('if (isNativeAndroid() || !visible) return null;'), 'Must return null in native Android');
});

test('App.jsx conditionally prevents PwaInstallPrompt mounting when isNative is true', () => {
  assert(appContent.includes('{!isNative && <PwaInstallPrompt />}'), 'Must guard mounting with {!isNative && <PwaInstallPrompt />}');
});

// ─────────────────────────────────────────────────────────────
// 2. CHAT OPTIONS MENU & SEPARATE BURN BUTTON
// ─────────────────────────────────────────────────────────────
console.log('\n--- 2. CHAT OPTIONS MENU RESTORATION & SEPARATE BURN ---');

const headerPath = path.join(ROOT, 'src/components/Header.jsx');
const headerContent = fs.readFileSync(headerPath, 'utf8');
const tokensCssPath = path.join(ROOT, 'src/styles/u2u-tokens.css');
const tokensCssContent = fs.readFileSync(tokensCssPath, 'utf8');

test('Header.jsx imports MoreVertical icon from lucide-react', () => {
  assert(headerContent.includes('MoreVertical'), 'Must import MoreVertical icon');
});

test('Header.jsx defines native-chat-header-actions container in native chat mode', () => {
  assert(headerContent.includes('native-chat-header-actions'), 'Must wrap actions in native-chat-header-actions');
});

test('Header.jsx retains separate native-header-burn-btn', () => {
  assert(headerContent.includes('className="native-header-burn-btn"'), 'Burn button must remain separate dedicated pill');
});

test('Header.jsx mounts native-chat-menu-btn with MoreVertical icon', () => {
  assert(headerContent.includes('native-chat-menu-btn'), 'Must define native-chat-menu-btn');
  assert(headerContent.includes('<MoreVertical size={20} />'), 'Must render MoreVertical icon');
});

test('Header.jsx includes accessible aria-label="Chat options menu" on native menu button', () => {
  assert(headerContent.includes('aria-label="Chat options menu"'), 'Must have accessible label');
});

test('Header.jsx renders dropdown menu when menuOpen in native chat mode', () => {
  assert(headerContent.includes('{menuOpen && renderDropdownMenu()}'), 'Must render dropdown menu on toggle');
});

test('renderDropdownMenu includes Clear Chat action in chat view', () => {
  assert(headerContent.includes('onClick={() => { setMenuOpen(false); onOpenClearChat(); }}'), 'Clear Chat must call onOpenClearChat');
  assert(headerContent.includes('<span>Clear Chat</span>'), 'Must display Clear Chat label');
});

test('renderDropdownMenu keeps Burn separate by excluding Burn button in native dropdown', () => {
  assert(headerContent.includes('{!isNative && ('), 'Burn button in dropdown must be guarded with {!isNative && (');
});

test('renderDropdownMenu includes Leave Session, Security Details, Sound, and Appearance', () => {
  assert(headerContent.includes('<span>Leave Session</span>'), 'Must include Leave Session');
  assert(headerContent.includes('<span>Session & Security Details</span>'), 'Must include Security Details');
  assert(headerContent.includes('<span>Sound Effects:'), 'Must include Sound Effects');
  assert(headerContent.includes('<span>Appearance:'), 'Must include Appearance');
});

test('u2u-tokens.css styles native-chat-header-actions with flex layout and touch target', () => {
  assert(tokensCssContent.includes('.native-chat-header-actions'), 'Must style native-chat-header-actions');
  assert(tokensCssContent.includes('.native-chat-menu-btn'), 'Must style native-chat-menu-btn');
  assert(tokensCssContent.includes('touch-action: manipulation;'), 'Must optimize touch action for Android touchscreens');
});

// ─────────────────────────────────────────────────────────────
// 3. PROFILE PICTURE SYNCHRONIZATION & RECONNECT RESILIENCE
// ─────────────────────────────────────────────────────────────
console.log('\n--- 3. PROFILE PICTURE SYNCHRONIZATION & RECOVERY ---');

const chatViewPath = path.join(ROOT, 'src/components/ChatView.jsx');
const chatViewContent = fs.readFileSync(chatViewPath, 'utf8');
const serverPath = path.join(ROOT, 'server.js');
const serverContent = fs.readFileSync(serverPath, 'utf8');
const sessionStorePath = path.join(ROOT, 'src/utils/sessionStore.js');
const sessionStoreContent = fs.readFileSync(sessionStorePath, 'utf8');

test('ChatView.jsx extracts and updates peerIdentities upon receiving joined message', () => {
  assert(chatViewContent.includes('if (data.peerIdentities && typeof data.peerIdentities === \'object\')'), 'Must check data.peerIdentities');
  assert(chatViewContent.includes('onPeerIdentityChange?.(iden);'), 'Must invoke onPeerIdentityChange for peer identity in joined');
});

test('ChatView.jsx re-announces self identity upon receiving peer_joined', () => {
  assert(chatViewContent.includes('type: \'identity\','), 'Must re-send identity on peer_joined');
  assert(chatViewContent.includes('identity: selfIdentityRef.current'), 'Must pass selfIdentityRef.current');
});

test('ChatView.jsx includes identity in WebSocket join payload on open', () => {
  assert(chatViewContent.includes('identity: selfIdentityRef.current || undefined'), 'Must include identity in join message');
});

test('server.js records client identity from join payload in room.identities', () => {
  assert(serverContent.includes('if (msg.identity && typeof msg.identity === \'object\')'), 'Must parse msg.identity in case join');
  assert(serverContent.includes('room.identities.set(clientId,'), 'Must store joining identity in room.identities');
});

test('server.js broadcasts joining identity with peer_joined event', () => {
  assert(serverContent.includes('const joiningIdentity = room.identities ? room.identities.get(clientId) : null;'), 'Must get joining identity');
  assert(serverContent.includes('identity: joiningIdentity || undefined'), 'Must include identity in peer_joined');
});

test('sessionStore.js saves selfIdentity and peerIdentity for state resilience', () => {
  assert(sessionStoreContent.includes('selfIdentity: sessionData.selfIdentity || undefined,'), 'Must save selfIdentity');
  assert(sessionStoreContent.includes('peerIdentity: sessionData.peerIdentity || undefined,'), 'Must save peerIdentity');
});

test('App.jsx restores selfIdentity and peerIdentity from stored active session on reload/resume', () => {
  assert(appContent.includes('if (initialSession && initialSession.selfIdentity)'), 'Must restore selfIdentity from initialSession');
  assert(appContent.includes('const [peerIdentity, setPeerIdentity] = useState(() => initialSession?.peerIdentity || null);'), 'Must restore peerIdentity from initialSession');
});

test('App.jsx saves peerIdentity to active session store via handlePeerIdentityChange', () => {
  assert(appContent.includes('const handlePeerIdentityChange = useCallback((newPeer) => {'), 'Must define handlePeerIdentityChange');
  assert(appContent.includes('peerIdentity: newPeer'), 'Must persist new peer identity');
});

test('Header.jsx provides graceful fallback to default avatar on custom image load failure', () => {
  assert(headerContent.includes('onError={(e) => {'), 'Must handle image onError');
  assert(headerContent.includes('avatar-img-fallback'), 'Must mount fallback SVG');
  assert(headerContent.includes('getAvatarSvg(\'neon-neko\')'), 'Must fall back to neon-neko vector');
});

test('u2u-tokens.css sizes avatar images and fallback SVGs to completely fill 44px avatar circle', () => {
  assert(tokensCssContent.includes('.native-peer-avatar-circle .identity-avatar-img'), 'Must size avatar img inside circle');
  assert(tokensCssContent.includes('.native-peer-avatar-circle .identity-avatar-svg'), 'Must size avatar svg inside circle');
  assert(tokensCssContent.includes('width: 100%;'), 'Must be 100% width');
  assert(tokensCssContent.includes('height: 100%;'), 'Must be 100% height');
});

console.log('\n--- 4. NATIVE PROFILE PICTURE CROPPING ---');
const cropModalPath = path.join(ROOT, 'src', 'components', 'modals', 'AvatarCropModal.jsx');
const createProfileModalPath = path.join(ROOT, 'src', 'components', 'modals', 'CreateProfileModal.jsx');
const identitySelectionViewPath = path.join(ROOT, 'src', 'components', 'IdentitySelectionView.jsx');

test('AvatarCropModal exists and provides touch/pointer pan & pinch-to-zoom', () => {
  assert(fs.existsSync(cropModalPath), 'AvatarCropModal.jsx must exist');
  const cropContent = fs.readFileSync(cropModalPath, 'utf8');
  assert(cropContent.includes('handleTouchStart'), 'Must handle touch start');
  assert(cropContent.includes('handleTouchMove'), 'Must handle touch move (pan & pinch)');
  assert(cropContent.includes('dragRef.current.isPinching'), 'Must track pinch state');
  assert(cropContent.includes('Math.hypot'), 'Must compute touch distance for pinch-to-zoom');
});

test('AvatarCropModal provides circular preview and zoom controls', () => {
  const cropContent = fs.readFileSync(cropModalPath, 'utf8');
  assert(cropContent.includes('avatar-crop-mask-circle'), 'Must define circular preview mask');
  assert(cropContent.includes('avatar-crop-slider'), 'Must provide zoom slider');
  assert(cropContent.includes('data-testid="avatar-crop-zoom-slider"'), 'Must have accessible zoom slider');
  assert(cropContent.includes('ZoomIn') && cropContent.includes('ZoomOut'), 'Must provide zoom in/out buttons');
});

test('AvatarCropModal provides Cancel and Apply Crop actions with 512x512 canvas output', () => {
  const cropContent = fs.readFileSync(cropModalPath, 'utf8');
  assert(cropContent.includes('Apply Crop'), 'Must have Apply Crop button');
  assert(cropContent.includes('Cancel'), 'Must have Cancel button');
  assert(cropContent.includes('data-testid="apply-crop-btn"'), 'Must have apply-crop-btn testid');
  assert(cropContent.includes('data-testid="cancel-crop-btn"'), 'Must have cancel-crop-btn testid');
  assert(cropContent.includes('canvas.width = 512'), 'Must export 512px width');
  assert(cropContent.includes('canvas.height = 512'), 'Must export 512px height');
  assert(cropContent.includes("toDataURL('image/jpeg'"), 'Must export clean JPEG data URL');
});

test('CreateProfileModal and IdentitySelectionView integrate AvatarCropModal for native Android', () => {
  const createProfileContent = fs.readFileSync(createProfileModalPath, 'utf8');
  const identityContent = fs.readFileSync(identitySelectionViewPath, 'utf8');
  assert(createProfileContent.includes('AvatarCropModal'), 'CreateProfileModal must import AvatarCropModal');
  assert(createProfileContent.includes('isNativeAndroid()'), 'CreateProfileModal must gate with isNativeAndroid()');
  assert(createProfileContent.includes('isCropModalOpen'), 'CreateProfileModal must manage crop modal state');
  assert(identityContent.includes('AvatarCropModal'), 'IdentitySelectionView must import AvatarCropModal');
  assert(identityContent.includes('isNative'), 'IdentitySelectionView must gate with isNativeAndroid()');
  assert(identityContent.includes('isCropModalOpen'), 'IdentitySelectionView must manage crop modal state');
});

test('u2u-tokens.css includes responsive styling for crop viewport, circular mask, and controls', () => {
  assert(tokensCssContent.includes('.avatar-crop-viewport'), 'Must style crop viewport');
  assert(tokensCssContent.includes('.avatar-crop-mask-circle'), 'Must style circular mask with border and box-shadow');
  assert(tokensCssContent.includes('.avatar-crop-slider'), 'Must style zoom slider');
  assert(tokensCssContent.includes('.avatar-crop-controls'), 'Must style controls container');
});

console.log('\n--- 5. IDENTITY SELECTION SCREEN SCROLLING & ACCESSIBLE ACTION BUTTON ---');
test('Identity Selection wrapper is configured for full vertical scrolling with contain overscroll', () => {
  assert(tokensCssContent.includes('html.u2u-native .identity-selection-wrapper'), 'Must style native wrapper');
  assert(tokensCssContent.includes('overflow-y: auto !important;'), 'Must have vertical scrolling');
  assert(tokensCssContent.includes('-webkit-overflow-scrolling: touch !important;'), 'Must have iOS/Android momentum scroll');
  assert(tokensCssContent.includes('overscroll-behavior-y: contain'), 'Must contain vertical overscroll');
});

test('Identity card and form allow natural content expansion without clipping', () => {
  assert(tokensCssContent.includes('html.u2u-native .identity-card'), 'Must style identity-card');
  assert(tokensCssContent.includes('html.u2u-native .identity-form'), 'Must style identity-form');
  assert(!tokensCssContent.includes('margin-bottom: -72px !important;'), 'Must NOT have negative margin-bottom that clips bottom avatars');
});

test('Identity actions button is sticky with safe-area clearance and zero overlap with avatars', () => {
  assert(tokensCssContent.includes('html.u2u-native .identity-actions'), 'Must style identity-actions');
  assert(tokensCssContent.includes('position: sticky !important;'), 'Actions must be sticky');
  assert(tokensCssContent.includes('bottom: 0 !important;'), 'Actions must stick to bottom');
  assert(tokensCssContent.includes('margin-bottom: 0 !important;'), 'Actions must have margin-bottom: 0');
  assert(tokensCssContent.includes('var(--native-bottom-clear)'), 'Must include native bottom clearance');
});

console.log('\n--- 6. SEND PHOTO BOTTOM SHEET POSITIONING & SAFE-AREA CLEARANCE ---');
test('PhotoPreviewModal defines photo-send-dialog and photo-modal-actions', () => {
  const photoModalPath = path.join(ROOT, 'src', 'components', 'modals', 'PhotoPreviewModal.jsx');
  assert(fs.existsSync(photoModalPath), 'PhotoPreviewModal.jsx must exist');
  const photoContent = fs.readFileSync(photoModalPath, 'utf8');
  assert(photoContent.includes('photo-send-dialog'), 'Must use photo-send-dialog class');
  assert(photoContent.includes('photo-modal-actions'), 'Must use photo-modal-actions class');
  assert(photoContent.includes('photo-preview-frame'), 'Must use photo-preview-frame class');
  assert(photoContent.includes('view-once-toggle-card'), 'Must use view-once-toggle-card class');
});

test('u2u-tokens.css positions photo-send-dialog with safe-area elevation above system navigation', () => {
  assert(tokensCssContent.includes('html.u2u-native .photo-send-dialog'), 'Must style native photo-send-dialog');
  assert(tokensCssContent.includes('calc(18px + var(--native-bottom-clear))'), 'Must elevate bottom sheet above navigation bar');
  assert(tokensCssContent.includes('html.u2u-native .photo-send-dialog .photo-modal-actions'), 'Must style actions');
  assert(tokensCssContent.includes('html.u2u-native .photo-send-dialog .photo-preview-frame'), 'Must style preview frame');
  assert(tokensCssContent.includes('max-height: 200px !important;'), 'Must constrain preview frame height');
});

test('Photo bottom sheet provides responsive scaling for short screens / keyboard open', () => {
  assert(tokensCssContent.includes('@media (max-height: 640px)'), 'Must have short viewport media query');
  assert(tokensCssContent.includes('max-height: 130px !important;'), 'Must scale preview down on short viewports');
});

console.log('\n====================================================');
console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('====================================================');

if (failed > 0) {
  process.exit(1);
}

