
const CACHE_NAME = 'ruleta-caliche-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './data/prizes.json',
  './data/questions.json',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png'
  // Nota: no cacheamos el video por defecto, es pesado. Puedes añadirlo si lo deseas.
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin === location.origin) {
    // Cache First para estáticos
    e.respondWith(
      caches.match(e.request).then(res => res || fetch(e.request))
    );
  } else {
    // Network First para externos
    e.respondWith(
      fetch(e.request).catch(()=> caches.match(e.request))
    );
  }
});
