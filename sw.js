// 크래프톤 테니스 동호회 캘린더 - Service Worker
const CACHE = 'krafton-tennis-v3';
const STATIC = [
  '/krafton_tennis/',
  '/krafton_tennis/index.html',
  '/krafton_tennis/manifest.json',
  '/krafton_tennis/icon-192.png',
  '/krafton_tennis/icon-512.png',
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js',
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-storage.js',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700;800&display=swap',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Firebase API / Storage → 항상 네트워크 우선
  if (url.hostname.includes('firebase') ||
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('firebasestorage')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }

  // 폰트 / CDN → 캐시 우선
  if (url.hostname.includes('fonts.g') || url.hostname.includes('gstatic')) {
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }))
    );
    return;
  }

  // 앱 자체 파일 → 네트워크 우선, 실패 시 캐시
  e.respondWith(
    fetch(e.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
      return res;
    }).catch(() => caches.match(e.request))
  );
});
