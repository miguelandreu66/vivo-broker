// ════════════════════════════════════════════════════════════════
// VIVO — Service Worker
// Cache estratégico: app shell + fallback offline
// ════════════════════════════════════════════════════════════════

const CACHE_VERSION = 'vivo-v1';
const CACHE_NAME = `vivo-cache-${CACHE_VERSION}`;

// Recursos del app shell que precacheamos
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
];

// ── Install: precachear app shell ─────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {})
  );
});

// ── Activate: limpiar versiones viejas ────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith('vivo-cache-') && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch strategy ────────────────────────────────────────
// • API calls (/api/*)         → network-first, no cache
// • Navegación (HTML)          → network-first, fallback cache
// • Static (JS/CSS/img/fonts)  → cache-first
// ──────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Solo GET. Otros métodos van directo a la red.
  if (req.method !== 'GET') return;

  // ── API: nunca cachear ──
  if (url.pathname.startsWith('/api/') || url.href.includes('/api/')) {
    return; // dejar al browser hacerlo sin pasar por SW cache
  }

  // ── Navegación: network-first ──
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((m) => m || caches.match('/index.html')))
    );
    return;
  }

  // ── Estáticos: cache-first ──
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        // Solo cachear respuestas válidas same-origin
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => cached);
    })
  );
});

// ── Mensaje para forzar actualización desde el cliente ────
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
