const CACHE_NAME = 'bergtouren-shell-v4';
const SHELL_ASSETS = [
  './', './index.html', './fixseil.html', './shared.js',
  './manifest.json', './manifest-fixseil.json',
  './20260114_145500.jpg', './IMG_20260811_073051812_HDR.jpg',
  './IMG-20260816-WA0023.jpg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Jede Datei einzeln versuchen: schlägt eine fehl (z. B. falscher
      // Dateiname), werden die übrigen trotzdem gecacht statt gar nichts.
      return Promise.allSettled(
        SHELL_ASSETS.map((url) =>
          cache.add(url).catch((err) => console.warn('SW: konnte nicht cachen:', url, err))
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Nur eigene Dateien cachen (HTML/Bild/Manifest). Firebase-Aufrufe (andere Domain)
  // gehen immer direkt ans Netz, damit Daten aktuell bleiben.
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;

  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetchPromise = fetch(e.request)
        .then((networkResponse) => {
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, networkResponse.clone()));
          return networkResponse;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
