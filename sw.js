const CACHE_NAME = 'bergtouren-shell-v248';
const SHELL_ASSETS = [
  './', './index.html', './fixseil.html', './wandern.html', './0-shared.js', './0-ski-wandern.js', './look.css', './0-geo-ch.js',
  './manifest.json', './manifest-fixseil.json', './manifest-wandern.json', './wandern-hero.jpg',
  './share-target-index.html', './share-target-fixseil.html',
  './hero-skitour.jpg', './hero-hochtour.jpg',
  './fonts/fonts.css', './fonts/Manrope-normal-latin.woff2', './fonts/Manrope-normal-latin-ext.woff2',
  './fonts/InstrumentSerif-normal-latin.woff2', './fonts/InstrumentSerif-normal-latin-ext.woff2', './fonts/InstrumentSerif-italic-latin.woff2', './fonts/InstrumentSerif-italic-latin-ext.woff2',
  './icon-512.png', './msl-hero.jpg',
  './geo-ch-hillshade-firnspur.png', './geo-ch-hillshade-fixseil.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css',
  'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js'
];

// Web Share Target ("Teilen"-Ziel): Android/Chrome schickt geteilte Fotos/Links per POST
// an die share-target-*.html-Seiten (siehe manifest.json/manifest-fixseil.json). Es gibt
// dahinter keinen echten Server — der Service Worker fängt den POST hier ab, legt Text
// und Datei kurz im Cache ab und leitet dann auf die eigentliche App weiter, die sie dort
// wieder abholt (siehe checkSharedContent() in 0-shared.js).
const SHARE_CACHE = 'share-target-v1';
let fromCacheUntil = 0; // siehe fetch: Start aus dem Speicher bei schwachem Netz

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

// Kartenbibliotheken (feste Versionen) in einem eigenen Speicher, der Updates der App übersteht –
// sonst lud jedes Update MapLibre/Leaflet neu, und die Karte wartete beim ersten Start darauf.
const LIB_CACHE = 'bergtouren-libs-v1';
const isLibUrl = (u) => u.startsWith('https://unpkg.com/leaflet@1.9.4/') || u.startsWith('https://unpkg.com/maplibre-gl@4.7.1/');

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(LIB_CACHE).then((lib) => Promise.allSettled(SHELL_ASSETS.filter(isLibUrl).map((url) =>
      lib.match(url).then((hit) => hit || lib.add(url)).catch((err) => console.warn('SW: konnte nicht cachen:', url, err))
    ))).then(() => caches.open(CACHE_NAME)).then((cache) => {
      // Jede Datei einzeln versuchen: schlägt eine fehl (z. B. falscher
      // Dateiname), werden die übrigen trotzdem gecacht statt gar nichts.
      return Promise.allSettled(
        SHELL_ASSETS.filter((url) => !isLibUrl(url)).map((url) =>
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
      Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== LIB_CACHE && k !== SHARE_CACHE && !k.startsWith('bergtouren-beta-shell-')).map((k) => caches.delete(k)))
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
  const isLeaflet = e.request.url.startsWith('https://unpkg.com/leaflet@1.9.4/') || e.request.url.startsWith('https://unpkg.com/maplibre-gl@4.7.1/'); // Kartenbibliotheken (MapLibre; Leaflet nur noch für die Druckansicht)
  // Nur eigene Dateien + Leaflet cachen. Firebase-Aufrufe (andere Domain, ausser
  // Leaflet) gehen immer direkt ans Netz, damit Daten aktuell bleiben.
  if (e.request.method !== 'GET' || (url.origin !== location.origin && !isLeaflet)) return;

  // Bibliotheken mit fester Version: aus dem eigenen Speicher, nur beim ersten Mal aus dem Netz
  if (isLeaflet) {
    e.respondWith(caches.open(LIB_CACHE).then((lib) => lib.match(e.request).then((hit) => hit || caches.match(e.request).then((old) => old || fetch(e.request).then((res) => {
      if (res.ok || res.type === 'opaque') lib.put(e.request, res.clone());
      return res;
    })))));
    return;
  }

  // "Netzwerk zuerst": immer die neueste Version vom Server holen, wenn
  // Internet da ist. Nur bei fehlender Verbindung auf den Zwischenspeicher
  // zurückgreifen (Offline-Fallback). Verhindert, dass nach einem Update
  // noch kurzzeitig eine alte, zwischengespeicherte Version angezeigt wird.
  // Schwaches Netz (Berg): antwortet die Seite selbst nicht innert 4 s, startet die App aus dem
  // Speicher – und dann für diesen Start ALLE Dateien aus dem Speicher (nie alte und neue gemischt).
  // Eine verspätete Antwort wird in dem Fall nicht abgelegt (sonst nächster Start gemischt).
  const isNav = e.request.mode === 'navigate';
  const net = () => fetch(isNav
      ? new Request(e.request.url, {cache: 'no-cache', credentials: 'same-origin'})
      : new Request(e.request, {cache: 'no-cache'}));
  const store = (res) => {
    // Nur gültige Antworten ablegen: eine Fehlerseite (404/500) würde sonst offline die App ersetzen
    if ((res.ok || res.type === 'opaque') && !(Date.now() < fromCacheUntil)) caches.open(CACHE_NAME).then((cache) => cache.put(e.request, res.clone()));
    return res;
  };
  if (!isNav && Date.now() < fromCacheUntil) {
    e.respondWith(caches.match(e.request).then((hit) => hit || net()));
    return;
  }
  if (isNav) {
    // Offline gilt jede Adresse der Seite (z. B. index.html?d=hoch nach der Weiterleitung von fixseil.html),
    // auch wenn genau diese Adresse noch nie online geladen wurde
    const anyMatch = () => caches.match(e.request).then((hit) => hit || caches.match(e.request, {ignoreSearch: true}));
    e.respondWith(anyMatch().then((cached) => {
      const n = net().then(store);
      n.catch(() => {}); // verspätet fehlgeschlagen: egal, Speicher wurde schon geliefert
      if (!cached) return n.catch(() => anyMatch());
      let timer;
      const slow = new Promise((resolve) => { timer = setTimeout(() => { fromCacheUntil = Date.now() + 20000; resolve(cached); }, 4000); });
      return Promise.race([n.then((r) => { clearTimeout(timer); return r; }, () => { clearTimeout(timer); return cached; }), slow]);
    }));
    return;
  }
  e.respondWith(net().then(store).catch(() => caches.match(e.request)));
});
