// Cambia VERSION quando aggiorni i file (es. una nuova scheda) per forzare l'aggiornamento sul telefono.
const VERSION = 'v2';
const CACHE = 'palestra-' + VERSION;
const SHELL = [
  './', 'index.html', 'styles.css', 'app.js', 'scheda.json', 'aiuto.json', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
  'img/mob-toe-touch.svg', 'img/mob-wgs.svg', 'img/mob-anche.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('palestra-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Font Google: dalla cache, aggiornati in background
  if (url.host === 'fonts.googleapis.com' || url.host === 'fonts.gstatic.com') {
    e.respondWith(caches.open(CACHE).then(async (c) => {
      const hit = await c.match(req);
      const net = fetch(req).then((r) => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  if (url.origin !== location.origin) return;

  // File dell'app: prima la rete (così prendi la scheda aggiornata), se offline la cache
  e.respondWith(
    fetch(req)
      .then((r) => { if (r.ok) caches.open(CACHE).then((c) => c.put(req, r.clone())); return r; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('index.html')))
  );
});
