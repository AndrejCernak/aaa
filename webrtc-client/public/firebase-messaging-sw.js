// public/firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/10.5.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.5.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAqjB1QH9pSQDYfFw1lX0qBph3B6yJ_y_4",
  authDomain: "tokeny-246df.firebaseapp.com",
  projectId: "tokeny-246df",
  storageBucket: "tokeny-246df.appspot.com",
  messagingSenderId: "410206660442",
  appId: "1:410206660442:web:6cb530eac5c6ec5a9e77563"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: '/icon-192.png',
  });
});
