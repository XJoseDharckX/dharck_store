const CACHE_NAME = 'dharck-store-v2.1'; // Incrementa la versión
const urlsToCache = [
  '/',
  '/index.html',
  '/panel.html',
  '/image/logo1.png',
  '/manifest.json'
];

// Instalar nuevo service worker
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(urlsToCache);
    }).then(() => {
      // Forzar activación inmediata
      return self.skipWaiting();
    })
  );
});

// Activar y limpiar cachés antiguos
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('Eliminando caché antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Tomar control inmediato de todas las páginas
      return self.clients.claim();
    })
  );
});

// Estrategia de caché: Network First para APIs, Cache First para assets
self.addEventListener('fetch', function(event) {
  const url = new URL(event.request.url);
  
  // Para APIs, siempre ir a la red primero
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // No cachear respuestas de API
          return response;
        })
        .catch(() => {
          // Si falla la red, no hay fallback para APIs
          return new Response('Network error', { status: 503 });
        })
    );
    return;
  }
  
  // Para archivos estáticos, usar caché pero verificar actualizaciones
  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return fetch(event.request)
        .then(response => {
          // Actualizar caché con nueva versión
          if (response.status === 200) {
            cache.put(event.request, response.clone());
          }
          return response;
        })
        .catch(() => {
          // Si falla la red, usar caché
          return cache.match(event.request);
        });
    })
  );
});