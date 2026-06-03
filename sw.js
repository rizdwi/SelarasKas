const CACHE_NAME = 'selaraskas-v24';
const STATIC_ASSETS = [
    './',
    './index.html',
    './index.css',
    './app.js',
    './manifest.json',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap',
    'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.map(key => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    const req = event.request;
    const url = new URL(req.url);

    // Only intercept GET requests (ignore POST, PUT, DELETE)
    if (req.method !== 'GET') return;

    // API requests: Network first, fallback to cache
    if (url.pathname.includes('/api/')) {
        event.respondWith(
            fetch(req)
                .then(res => {
                    const resClone = res.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(req, resClone));
                    return res;
                })
                .catch(() => caches.match(req))
        );
        return;
    }

    // Static assets: Cache first, fallback to network
    event.respondWith(
        caches.match(req).then(cachedRes => {
            return cachedRes || fetch(req).then(res => {
                const resClone = res.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(req, resClone));
                return res;
            });
        })
    );
});
