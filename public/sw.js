const CACHE_NAME = 'dharck-store-v3.3.2';
const urlsToCache = [
    '/',
    '/index.html',
    '/index.css',
    '/version.js',
    '/manifest.json'
    // Removido imágenes del caché inicial para reducir tamaño
];

// Instalar Service Worker
self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                console.log('Cache abierto');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                // Activar inmediatamente el nuevo service worker
                return self.skipWaiting();
            })
    );
});

// Activar Service Worker
self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    // Eliminar cachés antiguos
                    if (cacheName !== CACHE_NAME) {
                        console.log('Eliminando caché antiguo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // Tomar control inmediatamente
            return self.clients.claim();
        })
    );
});

// Interceptar requests
self.addEventListener('fetch', function(event) {
    // Solo cachear requests GET
    if (event.request.method !== 'GET') {
        return;
    }
    
    // No cachear APIs dinámicas
    if (event.request.url.includes('/api/')) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then(function(response) {
                // Devolver desde caché si existe
                if (response) {
                    return response;
                }
                
                // Clonar request para uso
                const fetchRequest = event.request.clone();
                
                return fetch(fetchRequest).then(function(response) {
                    // Verificar si es una respuesta válida
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    
                    // Solo cachear imágenes pequeñas y recursos estáticos
                    const url = event.request.url;
                    if (url.includes('/image/') && !url.includes('vendedores')) {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then(function(cache) {
                                cache.put(event.request, responseToCache);
                            });
                    }
                    
                    return response;
                });
            })
            .catch(function() {
                // Fallback para páginas offline
                if (event.request.destination === 'document') {
                    return caches.match('/index.html');
                }
            })
    );
});

// Manejar errores
self.addEventListener('error', function(event) {
    console.error('Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', function(event) {
    console.error('Service Worker unhandled rejection:', event.reason);
});

// Limpiar caché periódicamente
self.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'CLEAN_CACHE') {
        caches.keys().then(function(cacheNames) {
            cacheNames.forEach(function(cacheName) {
                if (cacheName !== CACHE_NAME) {
                    caches.delete(cacheName);
                }
            });
        });
    }
});