/**
 * U2U Client-Side Cryptographic Engine
 * Built on standard W3C Web Crypto API (SubtleCrypto)
 * 
 * Standards:
 * - PBKDF2 with 100,000 iterations of SHA-256 for key derivation
 * - AES-GCM 256-bit for authenticated message & media encryption
 * - Cryptographically secure random 12-byte (96-bit) IV for each message
 * - Zero plaintext ever leaves the browser
 */

// Format Session ID: 4 chars - 4 chars - 2 chars (e.g. 7K4M-X92P-Q8)
const CHARSET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; // Removed confusing 0, O, 1, I, L

export function generateSessionId() {
  const getRandomChars = (len) => {
    const array = new Uint8Array(len);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => CHARSET[byte % CHARSET.length]).join('');
  };
  return `${getRandomChars(4)}-${getRandomChars(4)}-${getRandomChars(2)}`;
}

// Generate secure 4-word passcode from 128 curated distinct words (~28 bits entropy)
const PASSCODE_WORDS = [
  'amber', 'anchor', 'anthem', 'archer', 'arrow', 'atlas', 'beacon', 'blade',
  'blaze', 'bloom', 'breeze', 'bridge', 'brook', 'canyon', 'cedar', 'cinder',
  'cliff', 'cloud', 'clover', 'coast', 'comet', 'coral', 'crane', 'creek',
  'crest', 'dawn', 'delta', 'drift', 'dune', 'eagle', 'echo', 'ember',
  'fable', 'falcon', 'feather', 'fern', 'flare', 'flint', 'forest', 'frost',
  'galaxy', 'glade', 'glimmer', 'grove', 'harbor', 'haven', 'hawk', 'haze',
  'island', 'jasper', 'lagoon', 'leaf', 'lotus', 'lunar', 'meadow', 'mesa',
  'meteor', 'mist', 'moon', 'moss', 'nebula', 'nexus', 'north', 'oasis',
  'ocean', 'orbit', 'orchid', 'pebble', 'petal', 'phoenix', 'pine', 'planet',
  'plume', 'polar', 'pond', 'prairie', 'prism', 'pulse', 'quarry', 'quartz',
  'quest', 'quiet', 'radar', 'rain', 'ravine', 'reef', 'ridge', 'ripple',
  'river', 'robin', 'sage', 'sail', 'sand', 'shadow', 'shield', 'shore',
  'sierra', 'silver', 'slate', 'solar', 'solis', 'spark', 'spring', 'star',
  'stone', 'storm', 'stream', 'summit', 'swift', 'thistle', 'tide', 'timber',
  'trace', 'trail', 'valley', 'vapor', 'velvet', 'vessel', 'violet', 'vortex',
  'wave', 'willow', 'wind', 'winter', 'zenith', 'zephyr', 'zero', 'zone'
];

export function generatePasscode() {
  const array = new Uint8Array(4);
  crypto.getRandomValues(array);
  // Unbiased selection: 128 is an exact power of 2 (array[i] & 127)
  const mask = PASSCODE_WORDS.length - 1; // 127
  return `${PASSCODE_WORDS[array[0] & mask]}-${PASSCODE_WORDS[array[1] & mask]}-${PASSCODE_WORDS[array[2] & mask]}-${PASSCODE_WORDS[array[3] & mask]}`;
}

// Helper: Uint8Array <-> Base64
export function bufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function base64ToBuffer(base64) {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Derive SHA-256 hex hash of passcode for verification without exposing key
export async function hashPasscode(passcode, sessionId = '') {
  const enc = new TextEncoder();
  const cleanPasscode = String(passcode || '').trim();
  const cleanSessionId = String(sessionId || '').trim().toUpperCase();
  const data = enc.encode(`U2U-AUTH-V2:${cleanSessionId}:${cleanPasscode}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Derive AES-GCM 256-bit Key from Passcode + Session ID
export async function deriveKey(passcode, sessionId) {
  const enc = new TextEncoder();
  const cleanPasscode = passcode.trim();
  const cleanSessionId = sessionId.trim().toUpperCase();

  // Import raw passcode as key material
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(cleanPasscode),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // Salt derived deterministically from session ID
  const salt = enc.encode(`U2U-E2EE-SALT:${cleanSessionId}`);

  // Derive AES-GCM 256-bit key
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt']
  );

  return key;
}

// Encrypt plaintext or JS object
export async function encryptPayload(key, data) {
  const enc = new TextEncoder();
  const serialized = typeof data === 'string' ? data : JSON.stringify(data);
  const encoded = enc.encode(serialized);

  // 12-byte unique IV per message
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const cipherBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    encoded
  );

  return {
    iv: bufferToBase64(iv),
    ciphertext: bufferToBase64(cipherBuffer),
  };
}

// Decrypt payload
export async function decryptPayload(key, { iv, ciphertext }) {
  const ivBuffer = base64ToBuffer(iv);
  const cipherBuffer = base64ToBuffer(ciphertext);

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: new Uint8Array(ivBuffer),
    },
    key,
    cipherBuffer
  );

  const dec = new TextDecoder();
  const decodedStr = dec.decode(decryptedBuffer);

  try {
    return JSON.parse(decodedStr);
  } catch {
    return decodedStr;
  }
}

// Client-side image compression
export function compressImage(file, maxDimension = 1400, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to webp if supported, otherwise jpeg
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve({
          dataUrl,
          width,
          height,
          originalSize: file.size,
          compressedSize: Math.round((dataUrl.length * 3) / 4),
        });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}
