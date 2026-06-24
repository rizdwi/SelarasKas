const CACHE_NAME = 'selaraskas-v42';
const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    // ponytail: removed Google Fonts - system fonts instead
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

// Handle incoming push notifications
self.addEventListener('push', event => {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'SelarasKas';
    const options = {
        body: data.body || 'Ada notifikasi baru',
        icon: './icons/icon-192x192.png',
        badge: './icons/icon-192x192.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || './',
            dateOfArrival: Date.now()
        },
        actions: data.actions || []
    };
    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Handle notification click
self.addEventListener('notificationclick', event => {
    event.notification.close();
    const url = event.notification.data?.url || './';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
            for (const client of windowClients) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    return client.focus();
                }
            }
            return clients.openWindow(url);
        })
    );
});




