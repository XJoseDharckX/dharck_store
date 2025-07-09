const CACHE_NAME = 'dharck-store-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/panel.html',
  '/image/logo1.png',
  '/manifest.json'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open('admin-panel-v1').then(function(cache) {
      return cache.addAll([
        '/admin.html',
        '/manifest.json',
        '/logo.png'
      ]);
    })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(response) {
      return response || fetch(event.request);
    })
  );
});