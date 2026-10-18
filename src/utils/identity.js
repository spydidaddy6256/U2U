/**
 * U2U Identity Generator & Sanitizer
 * Generates memorable, friendly, anonymous names in the requested style
 * (e.g., VelvetFox, QuietComet, MidnightMochi, NeonFalcon).
 * Sanitizes and validates user input for safe rendering and transmission.
 */

const ADJECTIVES = [
  'Velvet', 'Quiet', 'Midnight', 'Neon', 'Cosmic', 'Solar', 'Shadow', 'Amber',
  'Silver', 'Ruby', 'Obsidian', 'Astral', 'Misty', 'Crystal', 'Ember', 'Silent',
  'Cinder', 'Zephyr', 'Phantom', 'Echo', 'Frost', 'Golden', 'Onyx', 'Shimmer'
];

const NOUNS = [
  'Fox', 'Comet', 'Mochi', 'Falcon', 'Otter', 'Lynx', 'Panda', 'Badger',
  'Kitsune', 'Wolf', 'Hawk', 'Raven', 'Prowler', 'Whiskers', 'Neko', 'Sentinel',
  'Specter', 'Vanguard', 'Drifter', 'Nova', 'Shadow', 'Prism', 'Spark', 'Tiger'
];

/**
 * Generates a clean random anonymous display name
 */
export function generateRandomDisplayName() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj}${noun}`;
}

/**
 * Validates and sanitizes a display name
 * Rules:
 * - 2 to 24 characters
 * - Strips HTML tags, control characters, and leading/trailing whitespace
 * - Safe for screen readers and UI headers
 */
export function sanitizeDisplayName(name, fallback = 'Anonymous') {
  if (typeof name !== 'string') return fallback;
  
  // Strip HTML tags and control chars
  const cleaned = name
    .replace(/<[^>]*>/g, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
    .trim();

  if (cleaned.length < 2) return fallback;
  return cleaned.slice(0, 24);
}

/**
 * Checks if a name passes strict validation
 */
export function isValidDisplayName(name) {
  if (typeof name !== 'string') return false;
  const trimmed = name.trim();
  return trimmed.length >= 2 && trimmed.length <= 24;
}

export const generateAnonymousName = generateRandomDisplayName;

export function validateDisplayName(name) {
  const valid = isValidDisplayName(name);
  return {
    valid,
    error: valid ? null : 'Username must be between 2 and 24 characters.'
  };
}

export const MAX_AVATAR_IMAGE_SIZE = 1024 * 1024; // 1 MB (1,048,576 bytes)
export const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Validates custom avatar file size and MIME type
 */
export function validateAvatarFile(file) {
  if (!file) {
    return { valid: false, error: 'No file selected' };
  }
  if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
    return { valid: false, error: 'Please select a valid image file (JPG, PNG, or WebP)' };
  }
  if (file.size > MAX_AVATAR_IMAGE_SIZE) {
    return { valid: false, error: 'Photo size must be under 1 MB' };
  }
  return { valid: true, error: null };
}
