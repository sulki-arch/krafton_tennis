// 크래프톤 테니스 동호회 캘린더 - Service Worker (v6)
const CACHE = 'krafton-tennis-v6';
const STATIC = [
  '/krafton_tennis/',
  '/krafton_tennis/index.html',
  '/krafton_tennis/manifest.json',
  '/krafton_tennis/icon-192.png',
  '/krafton_tennis/icon-512.png',
];

// FCM Firebase SDK (오류나도 SW 전체가 죽지 않도록 try-catch)
try {
  importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
  importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

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

  messaging.onBackgroundMessage((payload) => {
    const { title = '테니스 동호회', body = '' } = payload.notification || {};
    self.registration.showNotification(title, {
      body,
      icon: '/krafton_tennis/icon-192.png',
      badge: '/krafton_tennis/icon-192.png',
      vibrate: [200, 100, 200],
    });
  });
} catch(e) {
  console.warn('[SW] FCM 초기화 실패 (기능은 정상 작동):', e);
}

// 알림 클릭 → 앱 열기
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes('/krafton_tennis/') && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/krafton_tennis/');
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
  // 외부 도메인(Firebase 등)은 SW 개입 없음
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
