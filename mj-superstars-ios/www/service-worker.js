// ============================================================
// Top Performer - Service Worker (Network-first for everything)
// ============================================================

const CACHE_NAME = 'top-performer-v3';
const STATIC_CACHE = 'tp-static-v3';

// Static assets to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install: pre-cache essential assets and immediately activate
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up ALL old caches and take control immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== STATIC_CACHE)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: NETWORK-FIRST for everything (fall back to cache only when offline)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip WebSocket and analytics
  if (url.protocol === 'wss:' || url.hostname.includes('mixpanel') || url.hostname.includes('sentry')) {
    return;
  }

  // Network-first for ALL requests (API + static assets)
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful GET responses for offline fallback
        if (response.ok) {
          const clone = response.clone();
          const cacheName = url.pathname.startsWith('/api/') ? CACHE_NAME : STATIC_CACHE;
          caches.open(cacheName).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// Push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body || 'You have a new notification',
      icon: '/manifest.json',
      badge: '/manifest.json',
      tag: data.tag || 'tp-notification',
      data: { url: data.url || '/' },
      vibrate: [100, 50, 100]
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Top Performer', options)
    );
  } catch (err) {
    console.error('Push notification error:', err);
  }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        // Focus existing window if available
        for (const client of clients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        // Open new window
        return self.clients.openWindow(url);
      })
  );
});
