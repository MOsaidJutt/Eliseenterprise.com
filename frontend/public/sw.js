const CACHE = 'p6-analytics-v2';
const STATIC_PATH = '/_next/static/';

self.addEventListener('install', () => {
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
  const req = e.request;
  if (req.method !== 'GET' || req.url.includes('/api/')) return;

  const url = new URL(req.url);

  // Immutable, content-hashed build output — safe to serve from cache first.
  if (url.pathname.startsWith(STATIC_PATH)) {
    e.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(req, res.clone()));
        return res;
      }))
    );
    return;
  }

  // Everything else — HTML pages, the app shell — must always prefer the
  // network. These change on every deploy and can carry stale auth/session
  // logic; serving a cached copy here is what let old, buggy versions of
  // the app keep running indefinitely on some devices. Cache is only a
  // fallback for when the network is truly unreachable (offline).
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) caches.open(CACHE).then(c => c.put(req, res.clone()));
      return res;
    }).catch(() => caches.match(req))
  );
});
