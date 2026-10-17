/**
 * U2U Original Avatar Collection
 * 10 original anime-inspired and cat-themed vector avatars.
 * Rendered as lightweight, self-contained SVG strings / components.
 * Completely original, zero external network dependency, instant loading.
 */

export const AVATAR_PRESETS = [
  {
    id: 'neon-neko',
    name: 'Neon Neko',
    description: 'Cyberpunk feline with glowing warm visor',
    category: 'cat',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="grad_neon" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#2a1b24"/>
          <stop offset="100%" stop-color="#121017"/>
        </radialGradient>
        <linearGradient id="glow_ember" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ff6b4a"/>
          <stop offset="100%" stop-color="#e05e46"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#grad_neon)" stroke="#ff6b4a" stroke-width="2"/>
      <polygon points="26,42 16,18 40,28" fill="#1e1b26" stroke="#ff6b4a" stroke-width="2"/>
      <polygon points="74,42 84,18 60,28" fill="#1e1b26" stroke="#ff6b4a" stroke-width="2"/>
      <polygon points="28,38 20,22 36,30" fill="#e05e46" opacity="0.6"/>
      <polygon points="72,38 80,22 64,30" fill="#e05e46" opacity="0.6"/>
      <ellipse cx="50" cy="56" rx="28" ry="24" fill="#201d29"/>
      <path d="M 28 50 Q 50 46 72 50 L 70 60 Q 50 64 30 60 Z" fill="url(#glow_ember)"/>
      <line x1="32" y1="55" x2="68" y2="55" stroke="#ffffff" stroke-width="1.5" opacity="0.8"/>
      <line x1="22" y1="62" x2="10" y2="60" stroke="#ff6b4a" stroke-width="1.5" opacity="0.7"/>
      <line x1="22" y1="66" x2="12" y2="68" stroke="#ff6b4a" stroke-width="1.5" opacity="0.7"/>
      <line x1="78" y1="62" x2="90" y2="60" stroke="#ff6b4a" stroke-width="1.5" opacity="0.7"/>
      <line x1="78" y1="66" x2="88" y2="68" stroke="#ff6b4a" stroke-width="1.5" opacity="0.7"/>
      <polygon points="48,67 52,67 50,70" fill="#ff8f70"/>
      <path d="M 46 72 Q 50 75 54 72" fill="none" stroke="#ff8f70" stroke-width="1.5"/>
    </svg>`
  },
  {
    id: 'shadow-paw',
    name: 'Shadow Paw',
    description: 'Stealth black cat with glowing amber eyes',
    category: 'cat',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="grad_shadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#1f2128"/>
          <stop offset="100%" stop-color="#0a0c10"/>
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#grad_shadow)" stroke="#383b47" stroke-width="2"/>
      <polygon points="25,40 18,14 42,26" fill="#14161d" stroke="#e5a93c" stroke-width="1.5"/>
      <polygon points="75,40 82,14 58,26" fill="#14161d" stroke="#e5a93c" stroke-width="1.5"/>
      <polygon points="27,36 22,20 38,28" fill="#e5a93c" opacity="0.25"/>
      <polygon points="73,36 78,20 62,28" fill="#e5a93c" opacity="0.25"/>
      <ellipse cx="50" cy="56" rx="27" ry="23" fill="#14161d"/>
      <ellipse cx="38" cy="52" rx="6" ry="7" fill="#e5a93c"/>
      <ellipse cx="62" cy="52" rx="6" ry="7" fill="#e5a93c"/>
      <ellipse cx="38" cy="52" rx="2" ry="6" fill="#0c0d12"/>
      <ellipse cx="62" cy="52" rx="2" ry="6" fill="#0c0d12"/>
      <circle cx="36" cy="49" r="1.5" fill="#ffffff"/>
      <circle cx="60" cy="49" r="1.5" fill="#ffffff"/>
      <polygon points="48,63 52,63 50,65" fill="#e5a93c"/>
      <path d="M 45 67 Q 50 70 55 67" fill="none" stroke="#e5a93c" stroke-width="1.2"/>
    </svg>`
  },
  {
    id: 'solar-kitsune',
    name: 'Solar Kitsune',
    description: 'Anime spirit fox with ember marks',
    category: 'anime',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="grad_kitsune" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#341c19"/>
          <stop offset="100%" stop-color="#140a08"/>
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#grad_kitsune)" stroke="#ff4500" stroke-width="2"/>
      <polygon points="24,42 12,10 40,24" fill="#26120e" stroke="#ff4500" stroke-width="1.5"/>
      <polygon points="76,42 88,10 60,24" fill="#26120e" stroke="#ff4500" stroke-width="1.5"/>
      <polygon points="26,38 18,18 36,26" fill="#ff4500" opacity="0.45"/>
      <polygon points="74,38 82,18 64,26" fill="#ff4500" opacity="0.45"/>
      <path d="M 30 46 Q 50 36 70 46 Q 74 68 50 78 Q 26 68 30 46 Z" fill="#f4edea"/>
      <path d="M 34 50 Q 40 42 46 48" fill="none" stroke="#e05e46" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M 66 50 Q 60 42 54 48" fill="none" stroke="#e05e46" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M 36 56 Q 44 58 46 54" fill="none" stroke="#1a0c0a" stroke-width="2" stroke-linecap="round"/>
      <path d="M 64 56 Q 56 58 54 54" fill="none" stroke="#1a0c0a" stroke-width="2" stroke-linecap="round"/>
      <polygon points="48,68 52,68 50,71" fill="#e05e46"/>
      <circle cx="50" cy="42" r="3" fill="#e05e46"/>
    </svg>`
  },
  {
    id: 'cosmo-cat',
    name: 'Cosmo Cat',
    description: 'Space feline with starry reflection visor',
    category: 'cat',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="grad_cosmo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#18233a"/>
          <stop offset="100%" stop-color="#0b101c"/>
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#grad_cosmo)" stroke="#4a85ff" stroke-width="2"/>
      <circle cx="50" cy="52" r="34" fill="#141a29" stroke="#4a85ff" stroke-width="2"/>
      <path d="M 28 30 L 22 18 L 38 24 Z" fill="#141a29" stroke="#4a85ff" stroke-width="2"/>
      <path d="M 72 30 L 78 18 L 62 24 Z" fill="#141a29" stroke="#4a85ff" stroke-width="2"/>
      <ellipse cx="50" cy="52" rx="26" ry="22" fill="#0d1424" stroke="#ff6b4a" stroke-width="1.5"/>
      <circle cx="42" cy="50" r="4" fill="#ff6b4a"/>
      <circle cx="58" cy="50" r="4" fill="#ff6b4a"/>
      <circle cx="43" cy="49" r="1.5" fill="#ffffff"/>
      <circle cx="59" cy="49" r="1.5" fill="#ffffff"/>
      <circle cx="34" cy="42" r="1" fill="#ffffff" opacity="0.8"/>
      <circle cx="66" cy="44" r="1" fill="#ffffff" opacity="0.8"/>
      <circle cx="50" cy="38" r="1.5" fill="#ffffff" opacity="0.9"/>
    </svg>`
  },
  {
    id: 'kage-ronin',
    name: 'Kage Ronin',
    description: 'Anime cyber assassin with armored cowl',
    category: 'anime',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad_ronin" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#2c1e22"/>
          <stop offset="100%" stop-color="#0f0c10"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#grad_ronin)" stroke="#e05e46" stroke-width="2"/>
      <path d="M 20 78 Q 24 24 50 20 Q 76 24 80 78 Q 50 86 20 78 Z" fill="#16141c" stroke="#34303e" stroke-width="1.5"/>
      <ellipse cx="50" cy="52" rx="20" ry="22" fill="#0c0a10"/>
      <polygon points="34,48 44,52 36,54" fill="#ff5722"/>
      <polygon points="66,48 56,52 64,54" fill="#ff5722"/>
      <circle cx="39" cy="50" r="1" fill="#ffffff"/>
      <circle cx="61" cy="50" r="1" fill="#ffffff"/>
      <polygon points="40,58 60,58 56,70 44,70" fill="#201d28" stroke="#e05e46" stroke-width="1"/>
      <line x1="44" y1="64" x2="56" y2="64" stroke="#ff5722" stroke-width="1"/>
    </svg>`
  },
  {
    id: 'midnight-mochi',
    name: 'Midnight Mochi',
    description: 'Plump sleepy mochi kitten with soft blush',
    category: 'cat',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="grad_mochi" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#282638"/>
          <stop offset="100%" stop-color="#12101b"/>
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#grad_mochi)" stroke="#9da3b4" stroke-width="1.5"/>
      <ellipse cx="32" cy="28" rx="10" ry="12" fill="#1f1d2c" stroke="#9da3b4" stroke-width="1.5" transform="rotate(-15 32 28)"/>
      <ellipse cx="68" cy="28" rx="10" ry="12" fill="#1f1d2c" stroke="#9da3b4" stroke-width="1.5" transform="rotate(15 68 28)"/>
      <ellipse cx="32" cy="28" rx="6" ry="8" fill="#e05e46" opacity="0.4" transform="rotate(-15 32 28)"/>
      <ellipse cx="68" cy="28" rx="6" ry="8" fill="#e05e46" opacity="0.4" transform="rotate(15 68 28)"/>
      <ellipse cx="50" cy="58" rx="30" ry="24" fill="#1f1d2c"/>
      <path d="M 34 54 Q 40 50 44 54" fill="none" stroke="#f0f2f6" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M 56 54 Q 60 50 66 54" fill="none" stroke="#f0f2f6" stroke-width="2.5" stroke-linecap="round"/>
      <ellipse cx="32" cy="62" rx="5" ry="3" fill="#e05e46" opacity="0.5"/>
      <ellipse cx="68" cy="62" rx="5" ry="3" fill="#e05e46" opacity="0.5"/>
      <path d="M 46 63 Q 50 66 54 63" fill="none" stroke="#f0f2f6" stroke-width="2" stroke-linecap="round"/>
    </svg>`
  },
  {
    id: 'hyper-lynx',
    name: 'Hyper Lynx',
    description: 'Geometric cyber lynx with antenna ear tufts',
    category: 'cat',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="grad_lynx" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#24212e"/>
          <stop offset="100%" stop-color="#0d0c14"/>
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#grad_lynx)" stroke="#ff6b4a" stroke-width="2"/>
      <polygon points="26,44 14,14 38,26" fill="#1b1824" stroke="#ff6b4a" stroke-width="1.5"/>
      <polygon points="74,44 86,14 62,26" fill="#1b1824" stroke="#ff6b4a" stroke-width="1.5"/>
      <line x1="14" y1="14" x2="8" y2="4" stroke="#ff6b4a" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="86" y1="14" x2="92" y2="4" stroke="#ff6b4a" stroke-width="2.5" stroke-linecap="round"/>
      <polygon points="50,34 76,52 68,76 32,76 24,52" fill="#1b1824" stroke="#484458" stroke-width="1.5"/>
      <polygon points="32,54 44,52 38,58" fill="#e5a93c"/>
      <polygon points="68,54 56,52 62,58" fill="#e5a93c"/>
      <polygon points="46,64 54,64 50,68" fill="#ff6b4a"/>
      <line x1="50" y1="68" x2="50" y2="72" stroke="#ff6b4a" stroke-width="1.5"/>
    </svg>`
  },
  {
    id: 'luna-cat',
    name: 'Luna Cat',
    description: 'Mystic feline marked with a glowing crescent',
    category: 'cat',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="grad_luna" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#2a2034"/>
          <stop offset="100%" stop-color="#100b17"/>
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#grad_luna)" stroke="#c488ff" stroke-width="1.5"/>
      <polygon points="26,38 18,16 40,26" fill="#1a1424" stroke="#c488ff" stroke-width="1.5"/>
      <polygon points="74,38 82,16 60,26" fill="#1a1424" stroke="#c488ff" stroke-width="1.5"/>
      <polygon points="28,34 22,20 36,28" fill="#c488ff" opacity="0.3"/>
      <polygon points="72,34 78,20 64,28" fill="#c488ff" opacity="0.3"/>
      <ellipse cx="50" cy="56" rx="27" ry="23" fill="#1a1424"/>
      <path d="M 50 36 A 5 5 0 0 1 50 46 A 4 4 0 0 0 50 36 Z" fill="#e5a93c"/>
      <ellipse cx="38" cy="54" rx="6" ry="7" fill="#e05e46"/>
      <ellipse cx="62" cy="54" rx="6" ry="7" fill="#e05e46"/>
      <circle cx="36" cy="52" r="2" fill="#ffffff"/>
      <circle cx="60" cy="52" r="2" fill="#ffffff"/>
      <polygon points="48,65 52,65 50,68" fill="#e05e46"/>
      <path d="M 45 70 Q 50 73 55 70" fill="none" stroke="#f0f2f6" stroke-width="1.5"/>
    </svg>`
  },
  {
    id: 'ghost-whiskers',
    name: 'Ghost Whiskers',
    description: 'Ethereal spirit cat floating in ember smoke',
    category: 'cat',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="grad_ghost" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#362322"/>
          <stop offset="100%" stop-color="#120c0c"/>
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#grad_ghost)" stroke="#ff4500" stroke-width="1.5"/>
      <path d="M 24 40 Q 18 12 36 24 Z" fill="#241716" stroke="#ff4500" stroke-width="1.5"/>
      <path d="M 76 40 Q 82 12 64 24 Z" fill="#241716" stroke="#ff4500" stroke-width="1.5"/>
      <path d="M 26 50 Q 50 38 74 50 Q 80 76 50 82 Q 20 76 26 50 Z" fill="#f8e8e6" opacity="0.9"/>
      <ellipse cx="40" cy="54" rx="5" ry="6" fill="#1a0c0a"/>
      <ellipse cx="60" cy="54" rx="5" ry="6" fill="#1a0c0a"/>
      <circle cx="41" cy="52" r="1.5" fill="#ff4500"/>
      <circle cx="61" cy="52" r="1.5" fill="#ff4500"/>
      <path d="M 46 66 Q 50 70 54 66" fill="none" stroke="#1a0c0a" stroke-width="2" stroke-linecap="round"/>
    </svg>`
  },
  {
    id: 'vanguard-mecha',
    name: 'Vanguard Mecha',
    description: 'Armored feline sentinel with glowing core',
    category: 'anime',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad_mecha" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#2a2d36"/>
          <stop offset="100%" stop-color="#0f1116"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#grad_mecha)" stroke="#e05e46" stroke-width="2"/>
      <polygon points="26,42 16,16 42,24" fill="#22252e" stroke="#e05e46" stroke-width="1.5"/>
      <polygon points="74,42 84,16 58,24" fill="#22252e" stroke="#e05e46" stroke-width="1.5"/>
      <line x1="24" y1="26" x2="34" y2="22" stroke="#ff5722" stroke-width="2"/>
      <line x1="76" y1="26" x2="66" y2="22" stroke="#ff5722" stroke-width="2"/>
      <polygon points="50,32 78,50 68,78 32,78 22,50" fill="#181a20" stroke="#484d5c" stroke-width="2"/>
      <rect x="32" y="48" width="12" height="6" rx="2" fill="#ff5722"/>
      <rect x="56" y="48" width="12" height="6" rx="2" fill="#ff5722"/>
      <line x1="33" y1="51" x2="43" y2="51" stroke="#ffffff" stroke-width="1"/>
      <line x1="57" y1="51" x2="67" y2="51" stroke="#ffffff" stroke-width="1"/>
      <polygon points="46,64 54,64 50,70" fill="#e5a93c"/>
      <circle cx="50" cy="40" r="2" fill="#ff5722"/>
    </svg>`
  }
];

export function getAvatarSvg(avatarId) {
  const match = AVATAR_PRESETS.find(a => a.id === avatarId);
  return match ? match.svg : AVATAR_PRESETS[0].svg;
}

export function getRandomAvatarId() {
  const idx = Math.floor(Math.random() * AVATAR_PRESETS.length);
  return AVATAR_PRESETS[idx].id;
}

export const AVATARS = AVATAR_PRESETS;

