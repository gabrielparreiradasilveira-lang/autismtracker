// Service Worker para Notificações Push
const CACHE_NAME = 'autism-support-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Cache opened');
      return cache.addAll(urlsToCache).catch((err) => {
        console.log('[Service Worker] Cache addAll error:', err);
      });
    })
  );
  self.skipWaiting();
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Tratamento de notificações push
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received:', event);
  
  let notificationData = {
    title: 'Apoio Autismo',
    body: 'Você tem uma nova notificação',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: 'notification',
    requireInteraction: false,
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        ...notificationData,
        ...data,
      };
    } catch (e) {
      notificationData.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      data: notificationData.data || {},
      actions: notificationData.actions || [],
      vibrate: [200, 100, 200],
    })
  );
});

// Tratamento de clique em notificação
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event);
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Procurar por uma janela já aberta
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Se não encontrar, abrir uma nova janela
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Tratamento de ação em notificação
self.addEventListener('notificationclose', (event) => {
  console.log('[Service Worker] Notification closed:', event);
});

// Sincronização em background
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);
  
  if (event.tag === 'sync-reminders') {
    event.waitUntil(
      fetch('/api/trpc/reminders.syncReminders', {
        method: 'POST',
      })
        .then((response) => response.json())
        .then((data) => {
          console.log('[Service Worker] Reminders synced:', data);
        })
        .catch((error) => {
          console.error('[Service Worker] Sync error:', error);
          throw error; // Retry
        })
    );
  }
});

// Fetch - Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Apenas cache para GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.ok) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache
        return caches.match(event.request).then((response) => {
          return response || new Response('Offline - Resource not available', { status: 503 });
        });
      })
  );
});
