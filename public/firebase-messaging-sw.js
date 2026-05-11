// Firebase Messaging service worker. Registered automatically by the
// Firebase SDK at scope /firebase-cloud-messaging-push-scope, so it doesn't
// conflict with vite-plugin-pwa's service worker at root scope.
//
// Firebase config below is intentionally hardcoded — these values are public
// (they're already in the deployed JS bundle). If you regenerate the Firebase
// web app config, update this file too.

importScripts('https://www.gstatic.com/firebasejs/11.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyDaUmPYWafp-96pGxgEAl-z99OY0kj63z0',
  authDomain: 'plant-reminder-a93bf.firebaseapp.com',
  projectId: 'plant-reminder-a93bf',
  storageBucket: 'plant-reminder-a93bf.firebasestorage.app',
  messagingSenderId: '20263821666',
  appId: '1:20263821666:web:72891dc57723b5a3f78c3b',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  // We send data-only payloads, so read from payload.data.
  const data = payload.data || {};
  const title = data.title || 'PlantPapi';
  const body = data.body || '';
  self.registration.showNotification(title, {
    body,
    icon: '/plant-reminder/pwa-192x192.png',
    badge: '/plant-reminder/pwa-64x64.png',
    data,
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('/plant-reminder/');
    }),
  );
});
