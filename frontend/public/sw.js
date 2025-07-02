// Service Worker for Push Notifications
const CACHE_NAME = 'ldh-donor-v1.0.0';
const STATIC_CACHE_NAME = 'ldh-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'ldh-dynamic-v1.0.0';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/logo.svg',
  '/_next/static/css/app/layout.css',
  '/_next/static/chunks/webpack.js',
  '/_next/static/chunks/main.js',
  '/offline.html'
];

// API endpoints to cache
const CACHEABLE_APIS = [
  '/api/v1/donor/dashboard',
  '/api/v1/donations/history',
  '/api/v1/payments/methods',
  '/api/v1/notifications'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Static assets cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Failed to cache static assets', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME && 
                cacheName !== CACHE_NAME) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!request.url.startsWith('http')) {
    return;
  }

  // Handle different types of requests with different strategies
  if (isStaticAsset(request)) {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE_NAME));
  } else if (isAPIRequest(request)) {
    event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE_NAME));
  } else if (isPageRequest(request)) {
    event.respondWith(staleWhileRevalidateStrategy(request, DYNAMIC_CACHE_NAME));
  } else {
    event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE_NAME));
  }
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');
  
  const options = {
    body: 'You have new updates in your donor dashboard',
    icon: '/logo.svg',
    badge: '/logo.svg',
    tag: 'donor-notification',
    renotify: true,
    requireInteraction: false,
    actions: [
      {
        action: 'view',
        title: 'View Dashboard',
        icon: '/logo.svg'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  if (event.data) {
    try {
      const data = event.data.json();
      options.body = data.body || options.body;
      options.title = data.title || 'LDH Notification';
      options.tag = data.tag || options.tag;
    } catch (error) {
      console.error('Service Worker: Failed to parse push data', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification('LDH Donor Portal', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/dashboard/donor')
    );
  } else if (event.action === 'dismiss') {
    // Just close the notification
    return;
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Background sync event
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered', event.tag);
  
  if (event.tag === 'donation-sync') {
    event.waitUntil(syncDonations());
  } else if (event.tag === 'notification-sync') {
    event.waitUntil(syncNotifications());
  }
});

// Message event - handle messages from the main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data && event.data.type === 'CACHE_UPDATE') {
    event.waitUntil(updateCache(event.data.url));
  }
});

// Caching strategies
async function cacheFirstStrategy(request, cacheName) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Cache-first strategy failed:', error);
    return await caches.match('/offline.html') || new Response('Offline');
  }
}

async function networkFirstStrategy(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network failed, trying cache:', error);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return await caches.match('/offline.html') || new Response('Offline');
    }
    
    return new Response('Offline', { status: 503 });
  }
}

async function staleWhileRevalidateStrategy(request, cacheName) {
  const cachedResponse = await caches.match(request);
  
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      const cache = caches.open(cacheName);
      cache.then(c => c.put(request, networkResponse.clone()));
    }
    return networkResponse;
  }).catch(() => {
    // If network fails and we have no cache, return offline page
    if (!cachedResponse && request.mode === 'navigate') {
      return caches.match('/offline.html') || new Response('Offline');
    }
    throw new Error('Network failed');
  });

  return cachedResponse || fetchPromise;
}

// Helper functions
function isStaticAsset(request) {
  return request.url.includes('/_next/static/') ||
         request.url.includes('/static/') ||
         request.url.endsWith('.css') ||
         request.url.endsWith('.js') ||
         request.url.endsWith('.png') ||
         request.url.endsWith('.jpg') ||
         request.url.endsWith('.jpeg') ||
         request.url.endsWith('.svg') ||
         request.url.endsWith('.ico');
}

function isAPIRequest(request) {
  return request.url.includes('/api/') ||
         CACHEABLE_APIS.some(api => request.url.includes(api));
}

function isPageRequest(request) {
  return request.mode === 'navigate' ||
         (request.method === 'GET' && request.headers.get('accept').includes('text/html'));
}

// Background sync functions
async function syncDonations() {
  try {
    // Get pending donations from IndexedDB
    const pendingDonations = await getPendingDonations();
    
    for (const donation of pendingDonations) {
      try {
        const response = await fetch('/api/v1/donations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${donation.token}`
          },
          body: JSON.stringify(donation.data)
        });
        
        if (response.ok) {
          await removePendingDonation(donation.id);
          console.log('Donation synced successfully:', donation.id);
        }
      } catch (error) {
        console.error('Failed to sync donation:', error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

async function syncNotifications() {
  try {
    // Sync notification read status
    const response = await fetch('/api/v1/notifications/sync', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${await getStoredToken()}`
      }
    });
    
    if (response.ok) {
      console.log('Notifications synced successfully');
    }
  } catch (error) {
    console.error('Failed to sync notifications:', error);
  }
}

// IndexedDB helper functions (simplified)
async function getPendingDonations() {
  // This would integrate with IndexedDB to get pending donations
  return [];
}

async function removePendingDonation(id) {
  // This would remove the donation from IndexedDB
  console.log('Removing pending donation:', id);
}

async function getStoredToken() {
  // This would get the stored auth token
  return localStorage.getItem('token');
}

async function updateCache(url) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const response = await fetch(url);
    
    if (response.ok) {
      await cache.put(url, response);
      console.log('Cache updated for:', url);
    }
  } catch (error) {
    console.error('Failed to update cache:', error);
  }
}

console.log('Service Worker loaded successfully'); 