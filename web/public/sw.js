const CACHE_NAME = 'boardbuddy-v12';
const STATIC_ASSETS = [
  '/manifest.json',
  '/mascot-192.png',
  '/mascot-512.png',
  '/mascot-maskable-512.png',
  '/apple-touch-icon.png',
  '/favicon.png',
  '/favicon-32.png'
];

function isDevOrDynamicModuleRequest(url) {
  const path = url.pathname;
  if (
    path.startsWith('/api/') ||
    path.startsWith('/src/') ||
    path.startsWith('/node_modules/') ||
    path.startsWith('/@') ||
    path === '/sw.js' ||
    path.toLowerCase().endsWith('.apk')
  ) {
    return true;
  }
  if (
    url.searchParams.has('v') ||
    url.searchParams.has('t') ||
    url.searchParams.has('import') ||
    url.searchParams.has('html-proxy')
  ) {
    return true;
  }
  return false;
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(STATIC_ASSETS.map((asset) => cache.add(asset)))
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (isDevOrDynamicModuleRequest(url)) return;

  // Network-first (no-store) for navigation/HTML requests so latest app shell is always served
  if (event.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('/index.html')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(async (networkResponse) => {
          const contentType = (networkResponse.headers.get('content-type') || '').toLowerCase();
          if (networkResponse && networkResponse.status === 200 && contentType.includes('text/html')) {
            const text = await networkResponse.clone().text().catch(() => '');
            if (!text.includes('Starting Server') && !text.includes('/src/main.tsx')) {
              const copy = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
            }
          }
          return networkResponse;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          const fallback = cached || (await caches.match('/index.html'));
          return fallback || Response.error();
        })
    );
    return;
  }

  // Network-first (no-cache) for JS/CSS bundles; never cache HTML error/fallback payloads under asset URLs
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.mjs')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then(async (networkResponse) => {
          const contentType = (networkResponse.headers.get('content-type') || '').toLowerCase();
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === 'basic' &&
            !contentType.includes('text/html')
          ) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
          }
          return networkResponse;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) {
            const cachedType = (cached.headers.get('content-type') || '').toLowerCase();
            if (!cachedType.includes('text/html')) {
              return cached;
            }
          }
          return Response.error();
        })
    );
    return;
  }

  // Stale-while-revalidate for static images/fonts/icons
  event.respondWith(
    caches.match(event.request).then(async (cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then(async (networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
          }
          return networkResponse;
        })
        .catch(() => null);

      if (cachedResponse) {
        return cachedResponse;
      }

      const networkResponse = await fetchPromise;
      return networkResponse || Response.error();
    })
  );
});
