// Service Worker for Firefly Tiny Homes
const CACHE_NAME = 'firefly-cache-v1'
const STATIC_CACHE = 'firefly-static-v1'
const API_CACHE = 'firefly-api-v1'

// Files to cache immediately
const STATIC_FILES = [
  '/',
  '/index.html',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/logo/firefly-logo.png',
  '/models/placeholder.svg'
]

// Install event - cache static files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_FILES)
    })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== API_CACHE) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
})

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request))
    return
  }

  // Handle static assets
  if (request.destination === 'image' || 
      request.destination === 'style' || 
      request.destination === 'script' ||
      request.destination === 'font') {
    event.respondWith(handleStaticRequest(request))
    return
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request))
    return
  }
})

async function handleApiRequest(request) {
  const cache = await caches.open(API_CACHE)
  
  // Don't cache POST requests - just pass them through
  if (request.method === 'POST') {
    return fetch(request)
  }
  
  try {
    // Try network first
    const response = await fetch(request)
    
    // Cache successful GET responses only
    if (response.ok && request.method === 'GET') {
      const clonedResponse = response.clone()
      cache.put(request, clonedResponse)
    }
    
    return response
  } catch (error) {
    // Fallback to cache for GET requests only
    const cachedResponse = await cache.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Return offline response for build-related APIs
    if (request.url.includes('/api/builds/')) {
      return new Response(JSON.stringify({ 
        error: 'offline', 
        message: 'You are offline. Please check your connection.' 
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    throw error
  }
}

async function handleStaticRequest(request) {
  const cache = await caches.open(STATIC_CACHE)
  
  // Check cache first
  const cachedResponse = await cache.match(request)
  if (cachedResponse) {
    return cachedResponse
  }
  
  try {
    // Try network
    const response = await fetch(request)
    if (response.ok) {
      const clonedResponse = response.clone()
      cache.put(request, clonedResponse)
    }
    return response
  } catch (error) {
    // Return placeholder for images
    if (request.destination === 'image') {
      return cache.match('/models/placeholder.svg')
    }
    throw error
  }
}

async function handleNavigationRequest(request) {
  const cache = await caches.open(STATIC_CACHE)
  
  try {
    // Try network first for navigation
    const response = await fetch(request)
    if (response.ok) {
      const clonedResponse = response.clone()
      cache.put(request, clonedResponse)
    }
    return response
  } catch (error) {
    // Fallback to cached index.html for SPA
    const cachedResponse = await cache.match('/index.html')
    if (cachedResponse) {
      return cachedResponse
    }
    throw error
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(syncOfflineData())
  }
})

async function syncOfflineData() {
  // This would sync any offline data when connection is restored
  console.log('Background sync triggered')
}

// Push notifications (for future use)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New update available',
    icon: '/logo/firefly-logo.png',
    badge: '/logo/firefly-logo.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  }

  event.waitUntil(
    self.registration.showNotification('Firefly Tiny Homes', options)
  )
})
