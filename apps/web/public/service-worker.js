/**
 * Service Worker for Push Notifications
 * Handles push events and notification display
 */

// Handle push events
self.addEventListener('push', (event) => {
  if (!event.data) {
    console.log('Push notification received with no data');
    return;
  }

  const data = event.data.json();
  const options = {
    body: data.body || '',
    icon: '/icon.png',
    badge: '/badge.png',
    data: data.data || {},
    tag: data.tag || 'notification',
    requireInteraction: data.requireInteraction || false,
  };

  if (data.image) {
    options.image = data.image;
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Notification', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already an open window with the target URL
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event.notification.tag);
});

// Install event
self.addEventListener('install', () => {
  // Don't auto-skipWaiting — let the app control when to activate
});

// Activate event - cleanup old caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('rukny-') === false)
          .map((name) => caches.delete(name))
      );
    }).then(() => clients.claim())
  );
});

// Listen for SKIP_WAITING message from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
