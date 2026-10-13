/**
 * U2U Verified Release Notes Configuration
 * 
 * Contains exclusively verified changes from actual repository commit history.
 * Easily maintainable for future updates.
 */

export const CURRENT_VERSION = '1.2.0';
export const CURRENT_RELEASE_DATE = 'October 11, 2026';

export const RELEASES = [
  {
    version: '1.2.0',
    date: 'October 11, 2026',
    isLatest: true,
    title: 'Cinematic Launch & Visual Polish',
    summary: 'Introducing the 3D cinematic launch reveal, improved modal backdrop blur, and mobile update notifications.',
    highlights: [
      {
        category: 'Experience',
        title: 'Cinematic 3D Launch Animation',
        description: 'Immersive entrance animation with 3D glowing spheres, specular glass highlights, and seamless transition into the app.'
      },
      {
        category: 'Design',
        title: 'Enhanced Backdrop Blur',
        description: 'Premium glassmorphism backdrop filter with darkened ambiance behind install and configuration modals.'
      },
      {
        category: 'Mobile',
        title: 'Mobile Update Notifications',
        description: 'Discoverable in-flow update alerts and release notes viewer designed specifically for Android and iOS devices.'
      }
    ]
  },
  {
    version: '1.1.0',
    date: 'October 8, 2026',
    isLatest: false,
    title: 'PWA Experience & Security Hardening',
    summary: 'Refined mobile installation flow, hardened WebSocket authentication, and view-once media timers.',
    highlights: [
      {
        category: 'PWA',
        title: 'Custom Mobile Install Flow',
        description: 'Native-feel install sheet with platform-specific instructions for Safari on iOS and Chrome on Android.'
      },
      {
        category: 'Security',
        title: 'WebSocket Reconnect Tickets',
        description: 'Single-use cryptographic tickets for session resumption, preventing replay attacks and connection hijacking.'
      },
      {
        category: 'Privacy',
        title: 'View-Once Media Safeguards',
        description: 'Strict 8-second client-and-server countdown for view-once photos, with automatic blurring when switching tabs.'
      }
    ]
  },
  {
    version: '1.0.0',
    date: 'October 7, 2026',
    isLatest: false,
    title: 'Initial U2U Deployment',
    summary: 'Zero-knowledge, end-to-end encrypted ephemeral chat for two participants.',
    highlights: [
      {
        category: 'Core',
        title: 'Zero-Knowledge Architecture',
        description: 'Client-derived AES-256-GCM encryption keys where the server never sees plaintexts or passcodes.'
      },
      {
        category: 'Privacy',
        title: 'Ephemeral Rooms',
        description: 'Automatic 24-hour expiration window with instant one-tap session burn capability.'
      }
    ]
  }
];
