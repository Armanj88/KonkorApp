/* Service worker for جمع‌بندی کنکور PWA
   Keeps a full copy of the app (pages, scripts, fonts, icons) on the device so it opens with no internet.
   Data itself lives in IndexedDB (see index.html); Supabase requests are never cached here. */
const CACHE = 'konkor-v4';
const PRECACHE = [
  './',
  './index.html',
  './periodic.html',
  './manifest.webmanifest',
  './lib/supabase.js',
  './lib/jszip.min.js',
  './lib/fonts.css',
  './lib/fonts/vazirmatn-arabic-400-normal.woff2',
  './lib/fonts/vazirmatn-arabic-500-normal.woff2',
  './lib/fonts/vazirmatn-arabic-700-normal.woff2',
  './lib/fonts/vazirmatn-arabic-800-normal.woff2',
  './lib/fonts/vazirmatn-latin-400-normal.woff2',
  './lib/fonts/vazirmatn-latin-500-normal.woff2',
  './lib/fonts/vazirmatn-latin-700-normal.woff2',
  './lib/fonts/vazirmatn-latin-800-normal.woff2',
  './lib/fonts/lalezar-arabic-400-normal.woff2',
  './lib/fonts/lalezar-latin-400-normal.woff2',
  './lib/fonts/ibm-plex-mono-latin-500-normal.woff2',
  './lib/fonts/ibm-plex-mono-latin-600-normal.woff2',
  './icons/icon-192.svg',
  './icons/icon-512.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(PRECACHE.map((u) => new Request(u, {cache: 'reload'}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function putCache(req, res) {
  if (res && res.ok && res.type === 'basic') {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copy));
  }
  return res;
}

// Pages: try the network for fresh versions, but if it doesn't answer within a few seconds
// (internet cut or hanging) serve the saved copy instead of leaving a blank screen.
function pageResponse(req) {
  const fallback = () =>
    caches.match(req, {ignoreSearch: true}).then((r) => r || caches.match('./index.html'));
  return new Promise((resolve) => {
    let settled = false;
    const finish = (r) => { if (!settled && r) { settled = true; resolve(r); } };
    const timer = setTimeout(() => { fallback().then(finish); }, 3000);
    fetch(req)
      .then((res) => { clearTimeout(timer); putCache(req, res); finish(res); })
      .catch(() => {
        clearTimeout(timer);
        fallback().then((r) => { if (r) finish(r); else if (!settled) { settled = true; resolve(Response.error()); } });
      });
  });
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // Supabase and anything external: straight to the network

  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(pageResponse(req));
    return;
  }

  // Scripts, fonts, icons: saved copy first, refreshed in the background.
  event.respondWith(
    caches.match(req, {ignoreSearch: true}).then((cached) => {
      const fetched = fetch(req).then((res) => putCache(req, res)).catch(() => cached);
      return cached || fetched;
    })
  );
});
