const CACHE_NAME = 'selaraskas-v34';
const STATIC_ASSETS = [
    './',
    './index.html',
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
    // Force the new SW to activate immediately, replacing the old one
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
    // Take control of all pages immediately
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    const req = event.request;
    const url = new URL(req.url);

    // Only intercept GET requests (ignore POST, PUT, DELETE)
    if (req.method !== 'GET') return;

    // NEVER cache app.js and index.css — always fetch from network
    // This ensures code updates are always reflected immediately
    if (url.pathname.endsWith('/app.js') || url.pathname.endsWith('/index.css')) {
        event.respondWith(
            fetch(req).catch(() => caches.match(req))
        );
        return;
    }

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

    // Other static assets: Network first, fallback to cache
    event.respondWith(
        fetch(req)
            .then(res => {
                const resClone = res.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(req, resClone));
                return res;
            })
            .catch(() => caches.match(req))
    );
});
