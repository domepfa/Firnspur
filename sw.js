const CACHE_NAME = 'bergtouren-shell-v29';
const SHELL_ASSETS = [
  './', './index.html', './fixseil.html', './0-shared.js',
  './manifest.json', './manifest-fixseil.json',
  './20260114_145500.jpg', './IMG_20260811_073051812_HDR.jpg',
  './IMG-20260816-WA0023.jpg', './msl-hero.jpg',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
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
  // Leaflet (Kartenbibliothek) ist die einzige externe Quelle, die wir dauerhaft
  // zwischenspeichern — ohne sie startet die Kartenansicht offline gar nicht erst.
  const isLeaflet = e.request.url.startsWith('https://unpkg.com/leaflet@1.9.4/');
  // Nur eigene Dateien + Leaflet cachen. Firebase-Aufrufe (andere Domain, ausser
  // Leaflet) gehen immer direkt ans Netz, damit Daten aktuell bleiben.
  if (e.request.method !== 'GET' || (url.origin !== location.origin && !isLeaflet)) return;

  // "Netzwerk zuerst": immer die neueste Version vom Server holen, wenn
  // Internet da ist. Nur bei fehlender Verbindung auf den Zwischenspeicher
  // zurückgreifen (Offline-Fallback). Verhindert, dass nach einem Update
  // noch kurzzeitig eine alte, zwischengespeicherte Version angezeigt wird.
  e.respondWith(
    fetch(e.request)
      .then((networkResponse) => {
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, networkResponse.clone()));
        return networkResponse;
      })
      .catch(() => caches.match(e.request))
  );
});
