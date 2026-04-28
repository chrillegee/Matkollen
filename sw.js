// Uppdatera versionsnumret nedan varje gång du laddar upp ny index.html
// Det tvingar alla användare att hämta ny version automatiskt
const VERSION = 'matdagbok-v6';
const STATIC = [
  './manifest.json',
  './icon-192.svg',
  './icon-512.svg',
  'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600;1,9..144,300&family=DM+Sans:wght@300;400;500&display=swap'
];

// Install – cacha bara statiska assets, INTE index.html
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(STATIC))
      .then(() => self.skipWaiting())
  );
});

// Activate – radera ALLA gamla cachar direkt
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Fetch-strategi:
// - index.html → NETWORK FIRST (hämtar alltid färsk version, faller tillbaka på cache)
// - Externa API:er → network only, ingen cachning
// - Övriga filer → cache first
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const isHTML = url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname.endsWith('/matdagbok/');
  const isExternal = url.origin !== self.location.origin;

  if(isExternal) {
    e.respondWith(fetch(e.request).catch(() => new Response('', {status:503})));
    return;
  }

  if(isHTML) {
    e.respondWith(
      fetch(e.request, {cache:'no-cache'})
        .then(res => {
          if(res && res.ok) {
            const clone = res.clone();
            caches.open(VERSION).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if(cached) return cached;
        return fetch(e.request).then(res => {
          if(res && res.ok) {
            const clone = res.clone();
            caches.open(VERSION).then(c => c.put(e.request, clone));
          }
          return res;
        });
      })
    );
  }
});
