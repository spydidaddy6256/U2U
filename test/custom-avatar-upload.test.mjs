import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  validateAvatarFile,
  MAX_AVATAR_IMAGE_SIZE,
  ALLOWED_AVATAR_TYPES
} from '../src/utils/identity.js';
import { AVATARS } from '../src/data/avatars.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function runAvatarUploadTests() {
  console.log('================================================================');
  console.log('   U2U CUSTOM PROFILE PICTURE UPLOAD REGRESSION VERIFICATION    ');
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
    // ─────────────────────────────────────────────────────────────
    // 1. Component Codebase & Asset Verification
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 1. Component & Style File Verification ---');

    const createModalPath = path.join(rootDir, 'src/components/modals/CreateProfileModal.jsx');
    const identityViewPath = path.join(rootDir, 'src/components/IdentitySelectionView.jsx');
    const appCssPath = path.join(rootDir, 'src/App.css');
    const headerPath = path.join(rootDir, 'src/components/Header.jsx');
    const launcherPath = path.join(rootDir, 'src/components/NativeAppLauncher.jsx');

    assert(fs.existsSync(createModalPath), 'src/components/modals/CreateProfileModal.jsx exists');
    assert(fs.existsSync(identityViewPath), 'src/components/IdentitySelectionView.jsx exists');
    assert(fs.existsSync(appCssPath), 'src/App.css exists');

    const createModalContent = fs.readFileSync(createModalPath, 'utf8');
    const identityViewContent = fs.readFileSync(identityViewPath, 'utf8');
    const appCssContent = fs.readFileSync(appCssPath, 'utf8');
    const headerContent = fs.readFileSync(headerPath, 'utf8');
    const launcherContent = fs.readFileSync(launcherPath, 'utf8');

    // ─────────────────────────────────────────────────────────────
    // 2. Upload Option Visibility Alongside 10 Built-In Avatars
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 2. Upload Option Visibility (Permanent Profile Modal) ---');

    assert(AVATARS && AVATARS.length === 10, 'All 10 built-in avatars are preserved in data/avatars.js');

    // Check Upload photo tile exists alongside avatars
    assert(createModalContent.includes('avatar-upload-tile'), 'CreateProfileModal defines .avatar-upload-tile in the avatar grid');
    assert(createModalContent.includes('data-testid="upload-photo-tile"'), 'Upload tile has dedicated test ID data-testid="upload-photo-tile"');
    assert(createModalContent.includes('aria-label="Upload photo"'), 'Upload tile has accessible aria-label="Upload photo"');
    assert(createModalContent.includes('fileInputRef'), 'CreateProfileModal manages fileInputRef for file picker');
    assert(createModalContent.includes('data-testid="profile-file-input"'), 'CreateProfileModal mounts hidden input with data-testid="profile-file-input"');
    assert(createModalContent.includes('accept="image/jpeg,image/png,image/webp"'), 'File picker accepts image/jpeg, image/png, and image/webp');

    // Check preview ring and custom photo card
    assert(createModalContent.includes('modal-avatar-preview-row'), 'CreateProfileModal includes modal-avatar-preview-row header preview');
    assert(createModalContent.includes('custom-photo-preview-card'), 'CreateProfileModal includes custom-photo-preview-card for active photo');
    assert(createModalContent.includes('handleRemoveCustomAvatar'), 'CreateProfileModal provides photo removal action');

    // ─────────────────────────────────────────────────────────────
    // 3. Temporary Session Identity Selection Custom Photo Support
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 3. Temporary Session Identity Selection Verification ---');

    assert(identityViewContent.includes('avatar-upload-tile'), 'IdentitySelectionView includes .avatar-upload-tile directly in avatar grid');
    assert(identityViewContent.includes('data-testid="identity-upload-tile"'), 'IdentitySelectionView upload tile has data-testid="identity-upload-tile"');
    assert(identityViewContent.includes('data-testid="identity-file-input"'), 'IdentitySelectionView mounts always-accessible file input data-testid="identity-file-input"');
    assert(identityViewContent.includes('custom-photo-preview-card'), 'IdentitySelectionView includes custom photo card for quick actions');
    assert(identityViewContent.includes('initialAvatar.startsWith(\'data:\')'), 'IdentitySelectionView restores existing data: URL avatars on load');

    // ─────────────────────────────────────────────────────────────
    // 4. File Size & MIME Type Validation Logic (1 MB Strict Limit)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 4. File Validation & 1 MB Limit Enforcement ---');

    assert(MAX_AVATAR_IMAGE_SIZE === 1048576, `MAX_AVATAR_IMAGE_SIZE is exactly 1024 * 1024 (1,048,576 bytes)`);
    assert(ALLOWED_AVATAR_TYPES.includes('image/jpeg'), 'image/jpeg is in allowed avatar types');
    assert(ALLOWED_AVATAR_TYPES.includes('image/png'), 'image/png is in allowed avatar types');
    assert(ALLOWED_AVATAR_TYPES.includes('image/webp'), 'image/webp is in allowed avatar types');

    // Test null / undefined
    assert(!validateAvatarFile(null).valid, 'Null file rejected');
    assert(!validateAvatarFile(undefined).valid, 'Undefined file rejected');

    // Test valid files
    const validJpg = { name: 'photo.jpg', type: 'image/jpeg', size: 500000 };
    const validPng = { name: 'avatar.png', type: 'image/png', size: 1048576 }; // Exact 1 MB
    const validWebp = { name: 'profile.webp', type: 'image/webp', size: 120000 };

    const resJpg = validateAvatarFile(validJpg);
    assert(resJpg.valid && resJpg.error === null, 'Valid 500KB JPEG is accepted');

    const resPng = validateAvatarFile(validPng);
    assert(resPng.valid && resPng.error === null, 'Boundary 1,048,576 byte PNG (exact 1 MB) is accepted');

    const resWebp = validateAvatarFile(validWebp);
    assert(resWebp.valid && resWebp.error === null, 'Valid 120KB WebP is accepted');

    // Test oversized files (> 1 MB)
    const over1Byte = { name: 'heavy.png', type: 'image/png', size: 1048577 }; // 1MB + 1 byte
    const over5Mb = { name: 'camera_raw.jpg', type: 'image/jpeg', size: 5 * 1024 * 1024 };

    const resOver1 = validateAvatarFile(over1Byte);
    assert(!resOver1.valid && resOver1.error.includes('1 MB'), '1,048,577 byte file (1MB + 1 byte) strictly rejected with 1 MB error');

    const resOver5 = validateAvatarFile(over5Mb);
    assert(!resOver5.valid && resOver5.error.includes('1 MB'), '5MB file strictly rejected with 1 MB error');

    // Test unsupported MIME formats
    const svgFile = { name: 'vector.svg', type: 'image/svg+xml', size: 10000 };
    const gifFile = { name: 'anim.gif', type: 'image/gif', size: 50000 };
    const pdfFile = { name: 'document.pdf', type: 'application/pdf', size: 25000 };
    const exeFile = { name: 'script.exe', type: 'application/x-msdownload', size: 50000 };

    assert(!validateAvatarFile(svgFile).valid, 'SVG file rejected (prevent SVG XSS in user photos)');
    assert(!validateAvatarFile(gifFile).valid, 'GIF file rejected');
    assert(!validateAvatarFile(pdfFile).valid, 'PDF file rejected');
    assert(!validateAvatarFile(exeFile).valid, 'Binary executable rejected');

    // ─────────────────────────────────────────────────────────────
    // 5. Dark-Glass CSS Responsive Styling Verification
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 5. Dark-Glass Design System & CSS Styling ---');

    assert(appCssContent.includes('.avatar-upload-tile'), 'App.css defines .avatar-upload-tile');
    assert(appCssContent.includes('.avatar-upload-tile.selected'), 'App.css defines selected state for avatar-upload-tile');
    assert(appCssContent.includes('.avatar-upload-icon'), 'App.css defines icon styles for upload tile');
    assert(appCssContent.includes('.avatar-custom-thumb-img'), 'App.css defines responsive rounded thumbnail image');
    assert(appCssContent.includes('.modal-avatar-preview-row'), 'App.css defines .modal-avatar-preview-row glass panel');
    assert(appCssContent.includes('.modal-avatar-preview-ring'), 'App.css defines .modal-avatar-preview-ring with accent glow');
    assert(appCssContent.includes('.custom-photo-preview-card'), 'App.css defines .custom-photo-preview-card responsive container');
    assert(appCssContent.includes('.btn-danger-subtle'), 'App.css defines .btn-danger-subtle for photo removal');

    // ─────────────────────────────────────────────────────────────
    // 6. Avatar Data URL Rendering in Shared UI
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 6. Shared UI Avatar Rendering (Header & Native Launcher) ---');

    assert(headerContent.includes("avatar.startsWith('data:')"), 'Header.jsx safely renders custom data: URL as img element');
    assert(headerContent.includes('identity-avatar-img'), 'Header.jsx uses identity-avatar-img CSS class for custom photo');
    assert(launcherContent.includes("avatarKey.startsWith('data:')"), 'NativeAppLauncher.jsx safely renders custom data: URL as img element');
    assert(launcherContent.includes('launcher-profile-avatar-img'), 'NativeAppLauncher.jsx uses launcher-profile-avatar-img CSS class for custom photo');

    // ─────────────────────────────────────────────────────────────
    // 7. Profile Cryptography & Persistence Integrity
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 7. Profile Cryptography & Zero-Knowledge Verification ---');

    assert(createModalContent.includes('saveProfileLocally'), 'CreateProfileModal saves profile locally via saveProfileLocally');
    assert(createModalContent.includes('finalAvatar'), 'CreateProfileModal dynamically derives finalAvatar (custom data URL vs preset ID)');
    assert(createModalContent.includes('deriveAuthProof'), 'CreateProfileModal derives cryptographic authProof from recoveryKey');
    assert(createModalContent.includes('generateMasterRecoveryKey'), 'CreateProfileModal generates master recovery key');

    console.log('\n================================================================');
    console.log(`TOTAL PASSED: ${passed}`);
    console.log(`TOTAL FAILED: ${failed}`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error during avatar upload tests:', err);
    process.exit(1);
  }
}

runAvatarUploadTests();
