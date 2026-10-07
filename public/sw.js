// U2U Privacy-First Minimal Service Worker
// Satisfies PWA installation criteria without caching private conversations, encryption keys, or API requests.

const CACHE_NAME = 'u2u-app-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // PRIVACY MANDATE: Never intercept, store, or cache API or WebSocket traffic
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/ws') || event.request.method !== 'GET') {
    return;
  }

  // Network-first for static shell assets with cache fallback
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request).then((response) => {
        return response || caches.match('/');
      });
    })
  );
});
