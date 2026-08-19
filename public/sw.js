// Self-destructing Service Worker to ensure old caches are cleared
// This replaces the old active SW to fix routing bugs on client machines
self.addEventListener('install', function(e) {
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          return caches.delete(cacheName);
        })
      );
    })
  );
  self.registration.unregister()
    .then(function() {
      return self.clients.matchAll();
    })
    .then(function(clients) {
      // Refresh active clients to restore normal network routing
      clients.forEach(client => client.navigate(client.url));
    });
});