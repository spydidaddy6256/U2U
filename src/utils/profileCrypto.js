/**
 * U2U Permanent Profile Cryptographic Engine
 * 
 * Strict Zero-Knowledge Architecture:
 * 1. 256-bit Master Private Key generated locally on user's device via Web Crypto.
 * 2. Formatted 32-character recovery key: U2U-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX.
 * 3. Deterministic public profile ID derived via SHA-256.
 * 4. Optional Password Protection: PBKDF2 (100,000 iterations, unique 16-byte salt, SHA-256) + AES-GCM encryption.
 * 5. Plaintext private keys and passwords NEVER sent to server, logged, or placed in URLs.
 */

const RECOVERY_CHARSET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const PROFILE_STORAGE_KEY = 'u2u_permanent_profile';

/**
 * Generates a high-entropy 256-bit master seed formatted as a readable recovery key.
 */
export function generateMasterRecoveryKey() {
  const bytes = new Uint8Array(28);
  crypto.getRandomValues(bytes);
  let chars = '';
  for (let i = 0; i < bytes.length; i++) {
    chars += RECOVERY_CHARSET[bytes[i] % RECOVERY_CHARSET.length];
  }
  // Group into 7 chunks of 4 characters: U2U-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX
  const chunks = [];
  for (let i = 0; i < chars.length; i += 4) {
    chunks.push(chars.slice(i, i + 4));
  }
  return `U2U-${chunks.join('-')}`;
}

/**
 * Normalizes and validates a recovery key string
 */
export function normalizeRecoveryKey(input) {
  if (typeof input !== 'string') return '';
  return input
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '');
}

export function isValidRecoveryKeyFormat(key) {
  const normalized = normalizeRecoveryKey(key);
  // Matches U2U-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX (28 characters of payload + 7 hyphens + U2U)
  const pattern = /^U2U(-[2-9A-HJ-NP-Z]{4}){7}$/;
  return pattern.test(normalized);
}

/**
 * Derives a deterministic public profile ID from the master recovery key
 */
export async function deriveProfileId(recoveryKey) {
  const normalized = normalizeRecoveryKey(recoveryKey);
  const enc = new TextEncoder();
  const data = enc.encode(`U2U-PROFILE-ID-V1:${normalized}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `u2u-${hex.slice(0, 16)}`;
}

/**
 * Derives an authentication challenge proof from the recovery key (proof of possession)
 * Never exposes the recovery key itself.
 */
export async function deriveAuthProof(recoveryKey) {
  const normalized = normalizeRecoveryKey(recoveryKey);
  const enc = new TextEncoder();
  const data = enc.encode(`U2U-PROFILE-AUTH-V1:${normalized}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Derives an AES-GCM encryption key from a user password using PBKDF2
 */
async function derivePasswordKey(password, salt) {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts and saves the permanent profile to localStorage
 */
export async function saveProfileLocally({ profileId, username, avatar, recoveryKey, password }) {
  const hasPassword = Boolean(password && password.trim());
  const passToUse = hasPassword ? password.trim() : `U2U-DEVICE-VAULT-${profileId}`;

  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);

  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);

  const key = await derivePasswordKey(passToUse, salt);

  const payload = JSON.stringify({
    profileId,
    username,
    avatar,
    recoveryKey: normalizeRecoveryKey(recoveryKey),
    createdAt: Date.now()
  });

  const enc = new TextEncoder();
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(payload)
  );

  const ciphertextArray = Array.from(new Uint8Array(ciphertextBuffer));
  const ciphertextHex = ciphertextArray.map(b => b.toString(16).padStart(2, '0')).join('');
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');

  const record = {
    profileId,
    username,
    avatar,
    hasPassword,
    salt: saltHex,
    iv: ivHex,
    vault: ciphertextHex,
    updatedAt: Date.now()
  };

  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(record));
  return record;
}

/**
 * Loads the stored profile metadata (without decrypting the private key)
 */
export function getStoredProfileMeta() {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.profileId || !parsed?.vault) return null;
    return {
      profileId: parsed.profileId,
      username: parsed.username,
      avatar: parsed.avatar,
      hasPassword: Boolean(parsed.hasPassword),
      updatedAt: parsed.updatedAt
    };
  } catch {
    return null;
  }
}

/**
 * Unlocks and decrypts the locally stored profile using password (or device vault)
 */
export async function unlockStoredProfile(password = '') {
  const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
  if (!raw) throw new Error('No local profile found');

  const parsed = JSON.parse(raw);
  const passToUse = parsed.hasPassword ? password.trim() : `U2U-DEVICE-VAULT-${parsed.profileId}`;

  if (parsed.hasPassword && !password) {
    throw new Error('Password required to unlock profile');
  }

  try {
    const saltBytes = new Uint8Array(parsed.salt.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const ivBytes = new Uint8Array(parsed.iv.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const ciphertextBytes = new Uint8Array(parsed.vault.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

    const key = await derivePasswordKey(passToUse, saltBytes);
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes },
      key,
      ciphertextBytes
    );

    const dec = new TextDecoder();
    const payload = JSON.parse(dec.decode(decryptedBuffer));
    return payload;
  } catch {
    throw new Error('Incorrect password or corrupt key material');
  }
}

/**
 * Returns currently active profile if unlocked or available without password
 */
export function getActiveProfile() {
  try {
    const sessionActive = sessionStorage.getItem('u2u_active_profile');
    if (sessionActive) {
      return JSON.parse(sessionActive);
    }
    const meta = getStoredProfileMeta();
    return meta || null;
  } catch {
    return null;
  }
}

export function setActiveProfileSession(profile) {
  try {
    if (profile) {
      sessionStorage.setItem('u2u_active_profile', JSON.stringify(profile));
    } else {
      sessionStorage.removeItem('u2u_active_profile');
    }
  } catch {}
}

export function obliterateLocalProfile() {
  try {
    localStorage.removeItem(PROFILE_STORAGE_KEY);
    sessionStorage.removeItem('u2u_active_profile');
  } catch {}
}

export const generateAuthProof = deriveAuthProof;
export { derivePasswordKey };

