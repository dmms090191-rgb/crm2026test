var CACHE_NAME = 'talvex-v4';
var SHELL_ASSETS = ['/', '/index.html', '/favicon.svg'];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(SHELL_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names.filter(function (name) { return name !== CACHE_NAME; }).map(function (name) { return caches.delete(name); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== 'GET') return;
  if (url.pathname.startsWith('/functions/')) return;
  if (url.pathname.startsWith('/rest/')) return;
  if (url.pathname.startsWith('/auth/')) return;
  if (url.pathname.startsWith('/storage/')) return;

  var isNavigation = event.request.mode === 'navigate';

  event.respondWith(
    fetch(event.request).catch(function () {
      if (isNavigation) {
        return caches.match('/index.html').then(function (r) {
          return r || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
        });
      }
      return caches.match(event.request).then(function (r) {
        return r || new Response('', { status: 404 });
      });
    })
  );
});

self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('push', function (event) {
  var data = { title: 'Talvex', body: 'Nouvelle notification', url: '/' };
  try {
    if (event.data) {
      data = Object.assign(data, event.data.json());
    }
  } catch (_e) {
    // fallback to defaults
  }

  var options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    data: { url: data.url || '/' },
    vibrate: [200, 100, 200],
    tag: data.tag || 'talvex-notification',
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.postMessage({ type: 'NOTIFICATION_CLICK', url: url });
          return;
        }
      }
      return clients.openWindow(url);
    })
  );
});
