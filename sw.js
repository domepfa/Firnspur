const CACHE_NAME = 'bergtouren-shell-v160';
const SHELL_ASSETS = [
  './', './index.html', './fixseil.html', './0-shared.js', './0-geo-ch.js',
  './manifest.json', './manifest-fixseil.json',
  './share-target-index.html', './share-target-fixseil.html',
  './20260114_145500.jpg', './IMG_20260811_073051812_HDR.jpg',
  './icon-512.png', './msl-hero.jpg',
  './geo-ch-hillshade-firnspur.png', './geo-ch-hillshade-fixseil.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// Web Share Target ("Teilen"-Ziel): Android/Chrome schickt geteilte Fotos/Links per POST
// an die share-target-*.html-Seiten (siehe manifest.json/manifest-fixseil.json). Es gibt
// dahinter keinen echten Server — der Service Worker fängt den POST hier ab, legt Text
// und Datei kurz im Cache ab und leitet dann auf die eigentliche App weiter, die sie dort
// wieder abholt (siehe checkSharedContent() in 0-shared.js).
const SHARE_CACHE = 'share-target-v1';

async function handleShareTarget(request, redirectPage){
  try{
    const formData = await request.formData();
    const text = formData.get('text') || '';
    const url = formData.get('url') || '';
    const title = formData.get('title') || '';
    const files = formData.getAll('sharedFiles').filter((f) => f && f.size);
    const cache = await caches.open(SHARE_CACHE);
    await cache.put('/__shared-data', new Response(JSON.stringify({
      text, url, title, fileCount: files.length
    }), { headers: { 'Content-Type': 'application/json' } }));
    for (let i = 0; i < files.length; i++){
      await cache.put('/__shared-file-' + i, new Response(files[i], {
        headers: { 'Content-Type': files[i].type || 'application/octet-stream' }
      }));
    }
  }catch(err){
    console.warn('SW: Teilen-Ziel konnte nicht verarbeitet werden:', err);
  }
  return Response.redirect(redirectPage + '?shared=1', 303);
}

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

  if (e.request.method === 'POST' && url.pathname.endsWith('/share-target-fixseil.html')){
    e.respondWith(handleShareTarget(e.request, new URL('./fixseil.html', url).toString()));
    return;
  }
  if (e.request.method === 'POST' && url.pathname.endsWith('/share-target-index.html')){
    e.respondWith(handleShareTarget(e.request, new URL('./index.html', url).toString()));
    return;
  }

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
