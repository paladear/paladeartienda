// ════════════════════════════════════════════════════════
// sw.js — Service Worker de Paladear Mercado de Sabores
// Versión: 1.1  |  Estrategia: Network-first con fallback
// ════════════════════════════════════════════════════════

const CACHE_VERSION = 'paladear-v2';

const SHELL_FILES = [
  '/paladeartienda/',
  '/paladeartienda/index.html',
  '/paladeartienda/android-chrome-192x192.png',
  '/paladeartienda/android-chrome-512x512.png',
  '/paladeartienda/apple-touch-icon.png',
  '/paladeartienda/favicon-32x32.png',
  '/paladeartienda/og-image.jpg',
];

// ── INSTALL ─────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(SHELL_FILES))
      .catch(err => console.warn('[SW] Error cacheando shell:', err))
  );
  self.skipWaiting();
});

// ── ACTIVATE: limpiar caches viejos ────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_VERSION)
          .map(k => {
            console.log('[SW] Eliminando cache viejo:', k);
            return caches.delete(k);
          })
      )
    )
  );
  self.clients.claim();
});

// ── FETCH: network-first para todo ─────────────────────
//
// Con internet  → sirve datos frescos y actualiza el caché.
// Sin internet  → sirve los últimos datos cacheados.
// Esto incluye las peticiones al Apps Script de Google
// (productos del Sheet), que antes se dejaban pasar sin
// cachear. Ahora se cachean igual que el resto.
//
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Solo manejar GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_VERSION)
            .then(cache => cache.put(event.request, clone))
            .catch(() => {});
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          return caches.match('/paladeartienda/index.html');
        });
      })
  );
});

// ── PUSH: placeholder para Fase 2 (OneSignal) ──────────
self.addEventListener('push', event => {
  console.log('[SW] Push recibido (OneSignal no configurado aún)');
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/paladeartienda/'));
});
