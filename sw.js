// Bump CACHE_VERSION on every deploy so all phones pick up the new build.
const CACHE_VERSION = 'shifra-v2';

const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/config.js',
  './js/icons.js',
  './js/db.js',
  './js/ui.js',
  './js/messages.js',
  './js/screens-core.js',
  './js/screens-flows.js',
  './js/app.js',
  './manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first for app code so updates reach everyone as soon as they're online.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('supabase.co')) return;

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html')))
  );
});
