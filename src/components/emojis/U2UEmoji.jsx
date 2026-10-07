import React from 'react';

/**
 * U2U Originals — Branded Vector Emoji Suite
 * 
 * Design Language:
 * - Simple, expressive, clean, and recognizable at all sizes (16px to 48px)
 * - Warm ember accents (#E05E46) harmonized with classic emoji warm golds, slates, and creams
 * - Consistent 36x36 viewBox, smooth rounded geometry, and crisp specular highlights
 * - Zero random neon wireframes or artificial AI gradients
 */

export default function U2UEmoji({ name, size = 24, className = '', title }) {
  const cleanId = String(name || '').replace(/^:|:$/g, '').toLowerCase();

  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    verticalAlign: 'middle',
    width: size,
    height: size,
    flexShrink: 0
  };

  const svgProps = {
    width: size,
    height: size,
    viewBox: '0 0 36 36',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    className: `u2u-emoji-svg ${cleanId} ${className}`,
    role: 'img',
    'aria-label': title || cleanId
  };

  switch (cleanId) {
    // 1. U2U Heart: Warm ember heart with the signature U2U connection nodes
    case 'u2u-heart':
      return (
        <span style={baseStyle} title={title || 'U2U Heart'}>
          <svg {...svgProps}>
            <defs>
              <linearGradient id="u2u-heart-fill" x1="18" y1="3" x2="18" y2="33" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#F06E57" />
                <stop offset="100%" stopColor="#C94933" />
              </linearGradient>
            </defs>
            {/* Heart body */}
            <path
              d="M18 31.8C17.4 31.4 4 22.4 4 12.2C4 6.8 8.4 3 13.8 3C16.8 3 18 4.4 18 4.4C18 4.4 19.2 3 22.2 3C27.6 3 32 6.8 32 12.2C32 22.4 18.6 31.4 18 31.8Z"
              fill="url(#u2u-heart-fill)"
            />
            {/* Specular curved rim */}
            <path
              d="M9 10C10 6.5 13 5 15.5 5"
              stroke="#FFFFFF"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeOpacity="0.55"
            />
            {/* U2U Node-Line-Node mark */}
            <circle cx="12.5" cy="15.5" r="2.2" fill="#FFFFFF" />
            <rect x="12.5" y="14.6" width="11" height="1.8" rx="0.9" fill="#FFFFFF" fillOpacity="0.9" />
            <circle cx="23.5" cy="15.5" r="2.2" fill="#FFFFFF" />
          </svg>
        </span>
      );

    // 2. U2U Secret: Sleek privacy lock with glowing amber keyhole
    case 'u2u-secret':
      return (
        <span style={baseStyle} title={title || 'U2U Secret'}>
          <svg {...svgProps}>
            <defs>
              <linearGradient id="u2u-secret-body" x1="18" y1="14" x2="18" y2="33" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#2E3344" />
                <stop offset="100%" stopColor="#181A22" />
              </linearGradient>
            </defs>
            {/* Shackle */}
            <path
              d="M11 16V10.5C11 6.36 14.13 3 18 3C21.87 3 25 6.36 25 10.5V16"
              stroke="#E05E46"
              strokeWidth="3.6"
              strokeLinecap="round"
            />
            {/* Lock body */}
            <rect x="6" y="14" width="24" height="19" rx="5" fill="url(#u2u-secret-body)" stroke="#3D445A" strokeWidth="1" />
            {/* Keyhole */}
            <circle cx="18" cy="22" r="2.4" fill="#FFCC4D" />
            <path d="M17 22.8L16.4 27.5H19.6L19 22.8" fill="#FFCC4D" />
          </svg>
        </span>
      );

    // 3. U2U Connection: Two connected peer nodes with an active pulse bridge
    case 'u2u-connection':
      return (
        <span style={baseStyle} title={title || 'U2U Connection'}>
          <svg {...svgProps}>
            {/* Outer subtle orbit path */}
            <ellipse cx="18" cy="18" rx="15" ry="11" stroke="#3D445A" strokeWidth="1.2" strokeDasharray="3 3" />
            {/* Connection beam */}
            <rect x="10" y="16.5" width="16" height="3" rx="1.5" fill="#E05E46" />
            {/* Left Node (Warm Ember) */}
            <circle cx="10" cy="18" r="6" fill="#E05E46" />
            <circle cx="10" cy="18" r="2.4" fill="#FFFFFF" />
            {/* Right Node (Warm Platinum) */}
            <circle cx="26" cy="18" r="6" fill="#F4F5F8" />
            <circle cx="26" cy="18" r="2.4" fill="#2E3344" />
            {/* Active center pulse */}
            <circle cx="18" cy="18" r="2" fill="#FFFFFF" />
          </svg>
        </span>
      );

    // 4. U2U Cipher: Geometric privacy shield defending a key glyph
    case 'u2u-cipher':
      return (
        <span style={baseStyle} title={title || 'U2U Cipher'}>
          <svg {...svgProps}>
            <defs>
              <linearGradient id="u2u-cipher-grad" x1="18" y1="3" x2="18" y2="33" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#2E3344" />
                <stop offset="100%" stopColor="#1A1C24" />
              </linearGradient>
            </defs>
            {/* Shield outline */}
            <path
              d="M18 3.5L7 7.5V17C7 24.5 11.8 30.5 18 33C24.2 30.5 29 24.5 29 17V7.5L18 3.5Z"
              fill="url(#u2u-cipher-grad)"
              stroke="#E05E46"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* Specular inner line */}
            <path
              d="M10 9L18 6L26 9"
              stroke="#FFFFFF"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeOpacity="0.35"
            />
            {/* Center key emblem */}
            <circle cx="18" cy="15" r="3" fill="#FFCC4D" />
            <path d="M18 18V25M18 22H21" stroke="#FFCC4D" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
      );

    // 5. U2U Private Eyes: Friendly curious eyes behind a sleek confidentiality visor
    case 'u2u-eyes':
      return (
        <span style={baseStyle} title={title || 'U2U Private Eyes'}>
          <svg {...svgProps}>
            {/* Eye whites */}
            <ellipse cx="11.5" cy="18" rx="6.5" ry="7.5" fill="#FFFFFF" />
            <ellipse cx="24.5" cy="18" rx="6.5" ry="7.5" fill="#FFFFFF" />
            {/* Eye pupils */}
            <ellipse cx="12" cy="18" rx="3.5" ry="4" fill="#1C1E26" />
            <ellipse cx="25" cy="18" rx="3.5" ry="4" fill="#1C1E26" />
            {/* Catchlights */}
            <circle cx="10.8" cy="16.5" r="1.4" fill="#FFFFFF" />
            <circle cx="23.8" cy="16.5" r="1.4" fill="#FFFFFF" />
            {/* Confidentiality visor bar with ember rim */}
            <rect x="3" y="14" width="30" height="8" rx="4" fill="#161822" fillOpacity="0.82" stroke="#E05E46" strokeWidth="1.4" />
          </svg>
        </span>
      );

    // 6. U2U Shhh: Expressive smiling face with index finger to lips
    case 'u2u-shhh':
      return (
        <span style={baseStyle} title={title || 'U2U Shhh'}>
          <svg {...svgProps}>
            {/* Classic yellow face */}
            <circle cx="18" cy="18" r="15" fill="#FFCC4D" />
            {/* Cheeks */}
            <ellipse cx="8.5" cy="20" rx="2.5" ry="1.5" fill="#F4900C" fillOpacity="0.5" />
            <ellipse cx="27.5" cy="20" rx="2.5" ry="1.5" fill="#F4900C" fillOpacity="0.5" />
            {/* Smiling happy eyes */}
            <path d="M9 14.5C10.5 12.5 13.5 12.5 15 14.5" stroke="#664500" strokeWidth="2" strokeLinecap="round" />
            <path d="M21 14.5C22.5 12.5 25.5 12.5 27 14.5" stroke="#664500" strokeWidth="2" strokeLinecap="round" />
            {/* Shhh index finger */}
            <rect x="16" y="17" width="4" height="13" rx="2" fill="#E8A838" stroke="#664500" strokeWidth="1.2" />
          </svg>
        </span>
      );

    // 7. U2U Together: Two smiling circle companions leaning together
    case 'u2u-together':
      return (
        <span style={baseStyle} title={title || 'U2U Together'}>
          <svg {...svgProps}>
            {/* Left face (Ember friend) */}
            <circle cx="13" cy="18" r="9" fill="#E05E46" />
            <path d="M9 16C10 15 11.5 15 12.5 16" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M14.5 16C15.5 15 17 15 18 16" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M11 20.5C12 22 14 22 15 20.5" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" />

            {/* Right face (Amber friend) */}
            <circle cx="23" cy="18" r="9" fill="#FFCC4D" stroke="#FFFFFF" strokeWidth="1" />
            <path d="M19 16C20 15 21.5 15 22.5 16" stroke="#664500" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M24.5 16C25.5 15 27 15 28 16" stroke="#664500" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M21 20.5C22 22 24 22 25 20.5" stroke="#664500" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </span>
      );

    // 8. U2U Encrypted Heart: Heart secured by a top padlock clasp
    case 'u2u-encrypted-heart':
      return (
        <span style={baseStyle} title={title || 'U2U Encrypted Heart'}>
          <svg {...svgProps}>
            {/* Padlock shackle arch */}
            <path
              d="M12 14V8.5C12 5.2 14.7 2.5 18 2.5C21.3 2.5 24 5.2 24 8.5V14"
              stroke="#94A3B8"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            {/* Heart body */}
            <path
              d="M18 32C17.4 31.6 5 23 5 13.5C5 8.5 9 5 14 5C16.8 5 18 6.2 18 6.2C18 6.2 19.2 5 22 5C27 5 31 8.5 31 13.5C31 23 18.6 31.6 18 32Z"
              fill="#E05E46"
            />
            {/* Center keyhole */}
            <circle cx="18" cy="16" r="2" fill="#FFFFFF" />
            <path d="M17.2 17L16.6 21H19.4L18.8 17" fill="#FFFFFF" />
          </svg>
        </span>
      );

    // 9. U2U Connected: Clean, warm trusting handshake
    case 'u2u-connected':
      return (
        <span style={baseStyle} title={title || 'U2U Connected'}>
          <svg {...svgProps}>
            {/* Left cuff (Ember) */}
            <rect x="2" y="14" width="7" height="9" rx="2" fill="#E05E46" />
            {/* Right cuff (Slate) */}
            <rect x="27" y="14" width="7" height="9" rx="2" fill="#2E3344" />
            {/* Clasped hands */}
            <path
              d="M8 16L14 13C15 12.5 16.5 12.8 17.5 13.8L21 17.5L25 15.5L27 18.5L22 22C21 22.8 19.5 22.8 18.5 22L15 19L11 21.5L8 18V16Z"
              fill="#F4B896"
            />
            <path
              d="M17.5 13.8L19.5 16L16.5 19L14.5 17C13.8 16.2 14 15 14.8 14.2L17.5 13.8Z"
              fill="#E89F7A"
            />
            {/* Small connection spark */}
            <circle cx="18" cy="11" r="1.5" fill="#FFCC4D" />
          </svg>
        </span>
      );

    // 10. U2U Locked: Solid tumbler padlock with ember active LED
    case 'u2u-locked':
      return (
        <span style={baseStyle} title={title || 'U2U Locked'}>
          <svg {...svgProps}>
            {/* Metallic shackle */}
            <path
              d="M11 15V9.5C11 5.6 14.1 2.5 18 2.5C21.9 2.5 25 5.6 25 9.5V15"
              stroke="#CBD5E1"
              strokeWidth="3.6"
              strokeLinecap="round"
            />
            {/* Solid brass/obsidian body */}
            <rect x="6" y="13" width="24" height="20" rx="4.5" fill="#1E212B" stroke="#3D445A" strokeWidth="1" />
            {/* Ember status indicator dot */}
            <circle cx="18" cy="18" r="1.8" fill="#E05E46" />
            {/* Keyhole */}
            <circle cx="18" cy="23.5" r="2" fill="#FFCC4D" />
            <path d="M17.3 24.5L16.8 28.5H19.2L18.7 24.5" fill="#FFCC4D" />
          </svg>
        </span>
      );

    // 11. U2U Spark: Four-pointed warm conversation starburst
    case 'u2u-spark':
      return (
        <span style={baseStyle} title={title || 'U2U Spark'}>
          <svg {...svgProps}>
            {/* Four-point nova spark */}
            <path
              d="M18 3C18 11.3 11.3 18 3 18C11.3 18 18 24.7 18 33C18 24.7 24.7 18 33 18C24.7 18 18 11.3 18 3Z"
              fill="#E05E46"
            />
            {/* Inner warm yellow core */}
            <path
              d="M18 9C18 14 14 18 9 18C14 18 18 22 18 27C18 22 22 18 27 18C22 18 18 14 18 9Z"
              fill="#FFCC4D"
            />
            {/* Center white twinkle */}
            <circle cx="18" cy="18" r="2.2" fill="#FFFFFF" />
          </svg>
        </span>
      );

    // 12. U2U Love: Classic warm round smiley face with warm ember heart eyes
    case 'u2u-love':
      return (
        <span style={baseStyle} title={title || 'U2U Love'}>
          <svg {...svgProps}>
            {/* Face base */}
            <circle cx="18" cy="18" r="15" fill="#FFCC4D" />
            {/* Left heart eye */}
            <path
              d="M12 15C11.6 14.8 8.5 12.5 8.5 10C8.5 8.6 9.6 7.5 11 7.5C11.8 7.5 12 8 12 8C12 8 12.2 7.5 13 7.5C14.4 7.5 15.5 8.6 15.5 10C15.5 12.5 12.4 14.8 12 15Z"
              fill="#E05E46"
            />
            {/* Right heart eye */}
            <path
              d="M24 15C23.6 14.8 20.5 12.5 20.5 10C20.5 8.6 21.6 7.5 23 7.5C23.8 7.5 24 8 24 8C24 8 24.2 7.5 25 7.5C26.4 7.5 27.5 8.6 27.5 10C27.5 12.5 24.4 14.8 24 15Z"
              fill="#E05E46"
            />
            {/* Cheerful wide smile */}
            <path
              d="M12 21C13.5 24.5 22.5 24.5 24 21"
              stroke="#664500"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
        </span>
      );

    default:
      return (
        <span style={baseStyle} title={title || 'U2U Emoji'}>
          <svg {...svgProps}>
            <circle cx="18" cy="18" r="14" fill="#E05E46" />
            <circle cx="18" cy="18" r="6" fill="#FFFFFF" />
          </svg>
        </span>
      );
  }
}

// Re-export helper for rendering U2U emoji tokens in text
export { renderMessageContent } from '../../utils/renderMessageContent';
