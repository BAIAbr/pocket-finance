// Finango Service Worker - Push Notifications

self.addEventListener('push', (event) => {
  let data = { title: 'Finango', body: 'Você tem uma nova notificação' };
  
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    console.error('Error parsing push data:', e);
  }

  const options = {
    body: data.body || 'Você tem uma nova notificação do Finango',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: { url: data.url || '/' },
    vibrate: [100, 50, 100],
    tag: data.tag || 'finango-notification',
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Finango', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
