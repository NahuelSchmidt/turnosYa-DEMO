// Service worker de notificaciones de Turnify (Firebase Cloud Messaging).
// Muestra los avisos de turnos aunque el panel esté cerrado.
importScripts('https://www.gstatic.com/firebasejs/11.9.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.9.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBc1gttodLpfA3SFufoYdPQZPxx9XCCGLI',
  authDomain: 'studio-6398913436-7a565.firebaseapp.com',
  projectId: 'studio-6398913436-7a565',
  messagingSenderId: '698662607235',
  appId: '1:698662607235:web:48ada980ee5f0f73183eb6',
});

// Con esto Firebase muestra solo las notificaciones que llegan con el panel cerrado
firebase.messaging();

// Notificaciones que mostramos nosotros con el panel abierto: al tocarlas, abrir el link
self.addEventListener('notificationclick', (event) => {
  const link = event.notification?.data?.link;
  if (!link) return;
  event.notification.close();
  event.waitUntil((async () => {
    const all = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of all) {
      if ('focus' in client) {
        await client.navigate(link).catch(() => {});
        return client.focus();
      }
    }
    return clients.openWindow(link);
  })());
});
