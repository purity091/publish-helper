// Advanced Service Worker for PWA functionality
const CACHE_NAME = 'pwa-cache-v1.0.0';
const ASSETS_CACHE = 'assets-cache-v1.0.0';
const API_CACHE = 'api-cache-v1.0.0';

// URLs to cache during installation
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and non-http protocols (including chrome-extension)
  if (request.method !== 'GET' || 
      (!url.protocol.startsWith('http') && !url.protocol.startsWith('https'))) {
    return;
  }

  // Handle API requests separately
  if (url.pathname.includes('/api/') || url.hostname !== location.hostname) {
    // Network-first strategy for API calls
    event.respondWith(networkFirstStrategy(request));
  } else if (/\.(css|js|png|jpg|jpeg|gif|svg|ico)$/.test(url.pathname)) {
    // Cache-first strategy for static assets
    event.respondWith(cacheFirstStrategy(request));
  } else {
    // Network-first strategy for pages with fallback to cache
    event.respondWith(networkFirstStrategy(request));
  }
});

// Network-first strategy with cache fallback
async function networkFirstStrategy(request) {
  const url = new URL(request.url);
  
  // Skip caching if the protocol is not HTTP/HTTPS
  if (!url.protocol.startsWith('http')) {
    return fetch(request);
  }

  try {
    const networkResponse = await fetch(request);

    // Only cache successful responses and valid schemes/methods
    if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
      if ((url.protocol === 'http:' || url.protocol === 'https:') && request.method === 'GET') {
        const cache = await caches.open(ASSETS_CACHE);
        cache.put(request, networkResponse.clone());
      }
    }

    return networkResponse;
  } catch (error) {
    // Fallback to cache if network fails
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return error page if both network and cache fail
    return new Response('Network error occurred', {
      status: 408,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Cache-first strategy
async function cacheFirstStrategy(request) {
  const url = new URL(request.url);
  
  // Skip caching if the protocol is not HTTP/HTTPS
  if (!url.protocol.startsWith('http')) {
    return fetch(request);
  }

  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    // Only cache successful responses and valid schemes/methods
    if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
      if ((url.protocol === 'http:' || url.protocol === 'https:') && request.method === 'GET') {
        const cache = await caches.open(ASSETS_CACHE);
        cache.put(request, networkResponse.clone());
      }
    }

    return networkResponse;
  } catch (error) {
    return new Response('Network error occurred', {
      status: 408,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== ASSETS_CACHE && cacheName !== API_CACHE) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Handle push notifications if needed
self.addEventListener('push', (event) => {
  // Handle push notifications here if implemented
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});