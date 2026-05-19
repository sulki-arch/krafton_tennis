// 크래프톤 테니스 동호회 캘린더 - Service Worker (FCM 지원)
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

const CACHE = 'krafton-tennis-v5';
const STATIC = [
  '/krafton_tennis/',
  '/krafton_tennis/index.html',
  '/krafton_tennis/manifest.json',
  '/krafton_tennis/icon-192.png',
  '/krafton_tennis/icon-512.png',
];

// Firebase 초기화 (FCM 백그라운드 메시지 수신)
firebase.initializeApp({
  apiKey: "AIzaSyAO5xhTn3KqUbwe774DyM5G3ADZUgGoYiw",
  authDomain: "krafton-tennis.firebaseapp.com",
  databaseURL: "https://krafton-tennis-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "krafton-tennis",
  storageBucket: "krafton-tennis.firebasestorage.app",
  messagingSenderId: "501340131138",
  appId: "1:501340131138:web:dd282e38553b6a2678c2db"
});

const messaging = firebase.messaging();

// 백그라운드 푸시 알림 처리
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] 백그라운드 메시지 수신:', payload);
  const { title = '테니스 동호회', body = '' } = payload.notification || {};
  const notificationOptions = {
    body,
    icon: '/krafton_tennis/icon-192.png',
    badge: '/krafton_tennis/icon-192.png',
    data: payload.data || {},
    vibrate: [200, 100, 200],
  };
  return self.registration.showNotification(title, notificationOptions);
});

// 알림 클릭 → 앱 열기
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/krafton_tennis/') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/krafton_tennis/');
      }
    })
  );
});

// ── 캐시 설치 ──
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).catch(() => {})
  );
  self.skipWaiting();
});

// ── 구버전 캐시 정리 ──
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── 네트워크 요청 처리 ──
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.hostname !== self.location.hostname) return;
  e.respondWith(
    fetch(e.request).then(res => {
      if (res && res.status === 200) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }).catch(() =>
      caches.match(e.request).then(r =>
        r || new Response('Offline', { status: 503, statusText: 'Service Unavailable' })
      )
    )
  );
});
