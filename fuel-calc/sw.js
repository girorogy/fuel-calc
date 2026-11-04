/**
 * JET-A1 Fuel Calculation System - Service Worker
 */
const CACHE_PREFIX = 'fuel-calc-cache-';
const CACHE_VERSION = 'v1.0.4';
const CURRENT_CACHE = `${CACHE_PREFIX}${CACHE_VERSION}`;

const PRECACHE_RESOURCES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable.png'
];

// 安裝：預快取必要資源並跳過等待
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CURRENT_CACHE)
      .then((cache) => cache.addAll(PRECACHE_RESOURCES))
      .then(() => self.skipWaiting())
  );
});

// 啟用：清除舊版快取並立即接管控制權
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames.map((name) => {
          if (
            name.startsWith(CACHE_PREFIX) &&
            name !== CURRENT_CACHE
          ) {
            return caches.delete(name);
          }
        })
      ))
      .then(() => self.clients.claim())
  );
});

// 請求處理：導覽採 Network First，靜態資源採 Cache First
self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  // HTML 導覽請求
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const networkResponse = await fetch(request);
        return networkResponse;
      } catch {
        const cachedPage = await caches.match(
          new URL('./index.html', self.registration.scope).href
        );

        if (cachedPage) return cachedPage;

        return new Response(
          '目前離線，找不到已快取的應用程式頁面。',
          {
            status: 503,
            headers: {
              'Content-Type': 'text/plain; charset=utf-8'
            }
          }
        );
      }
    })());

    return;
  }

  // 一般靜態資源請求
  event.respondWith((async () => {
    const cachedResponse = await caches.match(request);

    if (cachedResponse) return cachedResponse;

    try {
      const response = await fetch(request);

      if (
        response &&
        response.status === 200 &&
        response.type === 'basic'
      ) {
        const cache = await caches.open(CURRENT_CACHE);
        await cache.put(request, response.clone());
      }

      return response;
    } catch (error) {
      return new Response('Network error', { status: 408, headers: { 'Content-Type': 'text/plain' } });
    }
  })());
});