const CACHE_NAME = 'klasik-3d-v2.4.1';
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './studiologo.svg',
  './favicon.ico',
  './favicon.svg',
  './favicon-16x16.png',
  './favicon-32x32.png',
  './apple-touch-icon.png',
  './pwa-192x192.png',
  './pwa-512x512.png',
  './pwa-maskable-512x512.png'
];
const OPTIONAL_AUDIO_ASSETS = [
  './assets/aistudio/catpurr_c52b8326.wav',
  './assets/aistudio/meow1_1d7bd0df.wav',
  './assets/aistudio/meow2_445b0e23.wav',
  './assets/aistudio/meow3_780c1570.wav',
  './assets/aistudio/meow4_007510c4.wav',
  './assets/aistudio/meow5_445b0e23.wav',
  './assets/aistudio/meow6_70d1c317.wav',
  './assets/aistudio/meow7_780c1570.wav',
  './assets/aistudio/meow8_3c301d51.wav',
  './assets/aistudio/meow9_7fdd1ebb.wav'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(async (cache) => {
        await cache.addAll(PRECACHE_ASSETS);
        await Promise.allSettled(
          OPTIONAL_AUDIO_ASSETS.map((url) => cache.add(url).catch(() => null))
        );
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
            return null;
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Network-First strategy for HTML navigation requests so new GitHub Pages deployments never serve stale index.html
  if (
    request.mode === 'navigate' ||
    request.destination === 'document' ||
    url.pathname.endsWith('/index.html') ||
    url.pathname.endsWith('/')
  ) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match('./index.html'))
        )
    );
    return;
  }

  // Stale-While-Revalidate for static hashed assets, icons, and manifest
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
