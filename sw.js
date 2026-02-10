const CACHE_VERSION = 'v2.1.3'; // Updated to force refresh with main.js in all pages
const APP_CACHE = `hamdan-app-${CACHE_VERSION}`;
const RUNTIME_CACHE = `hamdan-runtime-${CACHE_VERSION}`;

// Core assets to precache (App Shell)
const PRECACHE_URLS = [
  './',
  './index.html',
  './dashboard.html',
  './course-details.html',
  './offline.html',
  './css/style.css',
  './js/pwa.js',
  './js/main.js',
  './js/profile.js',
  './js/courses-fixed.js',
  './js/playlists.js',
  './js/edit-profile.js',
  './js/notifications-improved.js',
  './images/logo.png',
  './images/logo_192.png',
  './images/logo_512.png'
];

self.addEventListener('install', (event) => {
  // Force waiting service worker to become active
  self.skipWaiting();

  event.waitUntil(
    caches.open(APP_CACHE).then(async (cache) => {
      // Add each precache URL individually so a single 404 doesn't fail the whole install
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            await cache.add(url);
          } catch (e) {
            // Ignore missing/failed assets during install to avoid bricking SW
            console.warn('SW precache skip (failed):', url);
          }
        })
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  // Take control of all clients immediately
  event.waitUntil(
    // Delete old caches
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => ![APP_CACHE, RUNTIME_CACHE].includes(k)).map((k) => {
        console.log('Deleting old cache:', k);
        return caches.delete(k);
      })
    )).then(() => {
      console.log('Service worker now active with cache version:', CACHE_VERSION);
      return self.clients.claim();
    })
  );
});

// Helper to detect API requests (adjust if your API domain changes)
function isApiRequest(url) {
  // Treat absolute API calls to your domain as API
  return /\/api\//.test(url.pathname);
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignore non-GET
  if (event.request.method !== 'GET') return;

  // Network-first for API requests
  if (isApiRequest(url)) {
    event.respondWith(
      fetch(event.request)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(event.request, copy));
          return resp;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Navigation requests: try network, then cache, then offline fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((resp) => {
          // Optionally cache navigations too
          const copy = resp.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(event.request, copy));
          return resp;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          return cached || caches.match('./offline.html');
        })
    );
    return;
  }

  // Network-first for JS files to avoid stale scripts
  if (event.request.url.includes('.js')) {
    event.respondWith(
      fetch(event.request)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(event.request, copy));
          return resp;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // Cache-first for other same-origin static assets
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(event.request, copy));
          return resp;
        })
        .catch(() => undefined);
    })
  );
});
