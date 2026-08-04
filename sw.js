// sw.js — Service Worker offline-first (cache-first + runtime para fuentes)
const VERSION = 'vate-v1.0.0';
const CORE = [
  './', './index.html', './manifest.webmanifest',
  './css/styles.css',
  './js/config.js', './js/lexicon.js', './js/utils.js',
  './js/storage.js', './js/exporters.js', './js/app.js',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png'
];
const FONTS = [
  'https://cdn.jsdelivr.net/npm/@fontsource/playfair-display@5/index.css',
  'https://cdn.jsdelivr.net/npm/@fontsource/playfair-display@5/700.css',
  'https://cdn.jsdelivr.net/npm/@fontsource/inter@5/400.css',
  'https://cdn.jsdelivr.net/npm/@fontsource/inter@5/600.css',
  'https://cdn.jsdelivr.net/npm/@fontsource/jetbrains-mono@5/400.css',
  'https://cdn.jsdelivr.net/npm/@fontsource/jetbrains-mono@5/700.css'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => Promise.allSettled([...CORE, ...FONTS].map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Navegación → network-first con fallback offline al shell
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(r => {
        const copy = r.clone();
        caches.open(VERSION).then(c => c.put('./index.html', copy));
        return r;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Fuentes externas (jsdelivr) → stale-while-revalidate
  if (url.hostname.includes('jsdelivr')) {
    e.respondWith(
      caches.match(req).then(hit => {
        const net = fetch(req).then(r => {
          if (r && (r.ok || r.type === 'opaque')) {
            const copy = r.clone();
            caches.open(VERSION).then(c => c.put(req, copy));
          }
          return r;
        }).catch(() => hit);
        return hit || net;
      })
    );
    return;
  }

  // Resto (misma origen) → cache-first
  e.respondWith(
    caches.match(req).then(hit =>
      hit || fetch(req).then(r => {
        if (r && r.ok) {
          const copy = r.clone();
          caches.open(VERSION).then(c => c.put(req, copy));
        }
        return r;
      })
    )
  );
});