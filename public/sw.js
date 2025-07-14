const CACHE_NAME = 'dharck-store-v3.2'; // Versión actualizada
const urlsToCache = [
  '/',
  '/index.html',
  '/panel.html',
  '/image/logo1.png',
  '/manifest.json'
];

// Instalar service worker
self.addEventListener('install', function(event) {
  console.log('Service Worker: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Service Worker: Cacheando archivos');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Instalación completa');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker: Error en instalación:', error);
      })
  );
});

// Activar y limpiar cachés antiguos
self.addEventListener('activate', function(event) {
  console.log('Service Worker: Activando...');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Eliminando caché antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activación completa');
      return self.clients.claim();
    })
  );
});

// Estrategia de caché mejorada
self.addEventListener('fetch', function(event) {
  // Ignorar requests de extensiones del navegador
  if (event.request.url.startsWith('chrome-extension://') || 
      event.request.url.startsWith('moz-extension://') ||
      event.request.url.startsWith('safari-extension://')) {
    return;
  }

  const url = new URL(event.request.url);
  
  // Para APIs, siempre ir a la red primero
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          return response;
        })
        .catch(error => {
          console.error('Service Worker: Error en API:', error);
          return new Response(JSON.stringify({error: 'Network error'}), {
            status: 503,
            headers: {'Content-Type': 'application/json'}
          });
        })
    );
    return;
  }
  
  // Para archivos estáticos, usar caché con network fallback
  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return fetch(event.request)
        .then(response => {
          if (response.status === 200) {
            cache.put(event.request, response.clone());
          }
          return response;
        })
        .catch(() => {
          return cache.match(event.request);
        });
    })
  );
});

// Manejar errores globales
self.addEventListener('error', function(event) {
  console.error('Service Worker: Error global:', event.error);
});

self.addEventListener('unhandledrejection', function(event) {
  console.error('Service Worker: Promise rechazada:', event.reason);
});