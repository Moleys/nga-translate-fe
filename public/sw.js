/**
 * NGA Forums - Service Worker
 * Provides offline support and caching strategies
 */

const CACHE_VERSION = 'nga-forums-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;

// Static assets to cache on install
const STATIC_ASSETS = [
    '/',
    '/manifest.json',
    '/assets/js/app.js',
    '/assets/css/app.css',
    '/assets/images/icons/icon-192x192.png',
    '/assets/images/icons/icon-512x512.png',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

// Cache size limits
const MAX_DYNAMIC_ITEMS = 50;
const MAX_IMAGE_ITEMS = 100;

/**
 * Install Event - Cache static assets
 */
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');

    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => {
            console.log('[SW] Caching static assets');
            return cache.addAll(STATIC_ASSETS);
        }).catch((error) => {
            console.error('[SW] Failed to cache static assets:', error);
        })
    );

    // Force activation of new service worker
    self.skipWaiting();
});

/**
 * Activate Event - Clean up old caches
 */
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name.startsWith('nga-forums-') && name !== STATIC_CACHE && name !== DYNAMIC_CACHE && name !== IMAGE_CACHE)
                    .map((name) => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        })
    );

    // Take control of all pages immediately
    return self.clients.claim();
});

/**
 * Fetch Event - Network-first with cache fallback
 */
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip chrome-extension and other non-http(s) schemes
    if (!url.protocol.startsWith('http')) {
        return;
    }

    // Different strategies based on request type
    if (isImageRequest(request)) {
        event.respondWith(cacheFirstStrategy(request, IMAGE_CACHE, MAX_IMAGE_ITEMS));
    } else if (isAPIRequest(request)) {
        event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE, MAX_DYNAMIC_ITEMS));
    } else if (isStaticAsset(request)) {
        event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
    } else {
        event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE, MAX_DYNAMIC_ITEMS));
    }
});

/**
 * Cache-First Strategy (for images and static assets)
 */
async function cacheFirstStrategy(request, cacheName, maxItems = null) {
    try {
        const cached = await caches.match(request);
        if (cached) {
            return cached;
        }

        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());

            // Limit cache size if needed
            if (maxItems) {
                limitCacheSize(cacheName, maxItems);
            }
        }

        return response;
    } catch (error) {
        console.error('[SW] Cache-first failed:', error);
        return new Response('Offline', { status: 503 });
    }
}

/**
 * Network-First Strategy (for API calls and dynamic content)
 */
async function networkFirstStrategy(request, cacheName, maxItems = null) {
    try {
        const response = await fetch(request);

        if (response.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());

            // Limit cache size if needed
            if (maxItems) {
                limitCacheSize(cacheName, maxItems);
            }
        }

        return response;
    } catch (error) {
        console.log('[SW] Network failed, trying cache:', request.url);
        const cached = await caches.match(request);

        if (cached) {
            return cached;
        }

        // Return offline page for HTML requests
        if (request.headers.get('accept').includes('text/html')) {
            return new Response(
                '<html><body><h1>Offline</h1><p>You are currently offline. Please check your internet connection.</p></body></html>',
                { headers: { 'Content-Type': 'text/html' } }
            );
        }

        return new Response('Network error', { status: 503 });
    }
}

/**
 * Limit cache size to prevent storage bloat
 */
async function limitCacheSize(cacheName, maxItems) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();

    if (keys.length > maxItems) {
        // Delete oldest items (FIFO)
        const itemsToDelete = keys.slice(0, keys.length - maxItems);
        await Promise.all(itemsToDelete.map((key) => cache.delete(key)));
        console.log(`[SW] Trimmed ${cacheName} cache from ${keys.length} to ${maxItems} items`);
    }
}

/**
 * Check if request is for an image
 */
function isImageRequest(request) {
    const url = request.url;
    return url.includes('/assets/images/') ||
           url.includes('wsrv.nl') ||
           url.includes('.png') ||
           url.includes('.jpg') ||
           url.includes('.jpeg') ||
           url.includes('.gif') ||
           url.includes('.webp') ||
           url.includes('.svg');
}

/**
 * Check if request is for API
 */
function isAPIRequest(request) {
    const url = request.url;
    return url.includes('/api/') ||
           url.includes('ngabbs.com') ||
           url.includes('nga.178.com');
}

/**
 * Check if request is for static asset
 */
function isStaticAsset(request) {
    const url = request.url;
    return url.includes('/assets/css/') ||
           url.includes('/assets/js/') ||
           url.includes('/assets/fonts/') ||
           url.includes('bootstrap') ||
           url.includes('cdn.jsdelivr.net');
}

/**
 * Background sync for offline actions
 */
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync:', event.tag);

    if (event.tag === 'sync-bookmarks') {
        event.waitUntil(syncBookmarks());
    }
});

/**
 * Sync bookmarks when back online
 */
async function syncBookmarks() {
    console.log('[SW] Syncing bookmarks...');
    // Implement bookmark sync logic here if needed
}

/**
 * Push notification support
 */
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};

    const options = {
        body: data.body || 'New notification from NGA Forums',
        icon: '/assets/images/icons/icon-192x192.png',
        badge: '/assets/images/icons/icon-96x96.png',
        data: data.url || '/'
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'NGA Forums', options)
    );
});

/**
 * Notification click handler
 */
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    event.waitUntil(
        clients.openWindow(event.notification.data || '/')
    );
});

console.log('[SW] Service worker loaded successfully');
