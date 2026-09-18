/**
 * service-worker.js
 * -----------------------------------------------------------------------
 * Offline support for BillBreak. Precaches the full app shell (HTML, CSS,
 * JS, fonts, icons, vendored QR library) on install so the app keeps
 * working with no network connection once it has been opened once and
 * installed. Uses a cache-first strategy for app-shell assets and a
 * network-first strategy with cache fallback for navigation requests.
 *
 * No backend, no external API calls — this only ever talks to this
 * app's own cache and its own origin.
 * -----------------------------------------------------------------------
 */

const CACHE_VERSION = 'billbreak-v1.0.0';
const CACHE_NAME = `billbreak-cache-${CACHE_VERSION}`;

const APP_SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',

  './css/variables.css',
  './css/base.css',
  './css/components.css',
  './css/onboarding.css',
  './css/splitter.css',
  './css/transactions.css',
  './css/settings.css',

  './js/vendor/qrcode.min.js',
  './js/storage.js',
  './js/upi.js',
  './js/splitter-logic.js',
  './js/theme.js',
  './js/toast.js',
  './js/onboarding.js',
  './js/qr-render.js',
  './js/transactions.js',
  './js/settings.js',
  './js/splitter-ui.js',
  './js/navigation.js',
  './js/app.js',

  './assets/fonts/fonts.css',
  './assets/fonts/files/inter-latin-400-normal.woff2',
  './assets/fonts/files/inter-latin-500-normal.woff2',
  './assets/fonts/files/inter-latin-600-normal.woff2',
  './assets/fonts/files/inter-latin-700-normal.woff2',
  './assets/fonts/files/poppins-latin-500-normal.woff2',
  './assets/fonts/files/poppins-latin-600-normal.woff2',
  './assets/fonts/files/poppins-latin-700-normal.woff2',

  './assets/fontawesome/css/all.min.css',
  './assets/fontawesome/webfonts/fa-solid-900.woff2',
  './assets/fontawesome/webfonts/fa-regular-400.woff2',

  './assets/icons/icon-72x72.png',
  './assets/icons/icon-96x96.png',
  './assets/icons/icon-128x128.png',
  './assets/icons/icon-144x144.png',
  './assets/icons/icon-152x152.png',
  './assets/icons/icon-192x192.png',
  './assets/icons/icon-384x384.png',
  './assets/icons/icon-512x512.png',
  './assets/icons/icon-maskable-512x512.png',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/favicon-16x16.png',
  './assets/icons/favicon-32x32.png',
];

// ---- Install: precache the entire app shell ----
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

// ---- Activate: clean up any old versioned caches ----
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('billbreak-cache-') && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ---- Fetch: cache-first for app shell, network-first (with cache
//      fallback) for navigations, so updates are picked up when online
//      but the app still opens instantly when offline. ----
self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // never touch cross-origin requests

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return networkResponse;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((networkResponse) => {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return networkResponse;
        })
        .catch(() => cached);
    })
  );
});
