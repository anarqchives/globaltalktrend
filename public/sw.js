const CACHE_NAME = 'globaltalk-v3';
const STATIC_ASSETS = [
  '/favicon.png',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/functions/')) return;

  // Network-first for HTML and JS (always get latest app)
  const isAppShell = event.request.destination === 'document' ||
    event.request.destination === 'script' ||
    url.pathname === '/';

  if (isAppShell) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((c) => c || new Response('Offline', { status: 503 })))
    );
    return;
  }

  // Cache-first for static assets (images, fonts, etc.)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});

// Push notification support
self.addEventListener('push', (event) => {
  let data = { title: '🚨 Anomalia detectada', body: 'Uma trend atingiu padrão anômalo.' };
  try {
    if (event.data) data = event.data.json();
  } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/favicon.png',
      badge: '/favicon.png',
      tag: 'anomaly-alert',
      renotify: true,
      data: data.url || '/',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});