/* eslint-disable no-undef */
/* eslint-disable no-restricted-globals */
// Scripts for firebase and firebase messaging
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// --- FIREBASE CONFIGURATION PLACEHOLDERS ---
// MUST MATCH YOUR src/lib/firebase.js CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyCR3nlDqreWbZJM07qgUT5lDZMaPPXdN-Y",
  authDomain: "b2b-nexus-77053.firebaseapp.com",
  projectId: "b2b-nexus-77053",
  storageBucket: "b2b-nexus-77053.firebasestorage.app",
  messagingSenderId: "138923655502",
  appId: "1:138923655502:web:c096bb20130a1d94239e1f",
  measurementId: "G-CN0RNH5HHV"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Background message handler
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icons/pwa-192x192.png', // Fallback icon
    image: payload.notification.image,
    data: {
        url: payload.data?.click_action || '/'
    }
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Notification click handler
self.addEventListener('notificationclick', function(event) {
  console.log('[firebase-messaging-sw.js] Notification click Received.', event);
  
  event.notification.close();

  // Handle opening the URL
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(urlToOpen) && 'focus' in client) {
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