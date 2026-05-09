// ════════════════════════════════════════════════════════
// sw.js — Service Worker de Paladear Mercado de Sabores
// Versión: 1.0  |  Estrategia: Network-first con fallback
// ════════════════════════════════════════════════════════
//
// NOTA PARA FASE 2 (OneSignal):
// Cuando agregues OneSignal, este archivo se reemplaza por
// OneSignalSDKWorker.js que importa el SDK de OneSignal +
// incluye este mismo código de caché debajo.
// ════════════════════════════════════════════════════════

const CACHE_VERSION = 'paladear-v1';

// Archivos del shell que se cachean al instalar
const SHELL_FILES = [
  '/paladeartienda/',
  '/paladeartienda/index.html',
  '/paladeartienda/android-chrome-192x192.png',
  '/paladeartienda/android-chrome-512x512.png',
  '/paladeartienda/apple-touch-icon.png',
  '/paladeartienda/favicon-32x32.png',
  '/paladeartienda/og-image.jpg',
];

// ── INSTALL: cachear shell ──────────────────────────────
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

// ── FETCH: estrategia por tipo de recurso ──────────────
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // 1. Siempre red para peticiones dinámicas (Google Apps Script / Sheets JSONP)
  if (
    url.includes('script.google.com') ||
    url.includes('docs.google.com') ||
    url.includes('drive.google.com') ||
    url.includes('googleapis.com')
  ) {
    return; // deja pasar sin interceptar → fetch normal del browser
  }

  // 2. Solo manejar GET
  if (event.request.method !== 'GET') return;

  // 3. Solo recursos del mismo origen (paladear.github.io)
  if (!url.startsWith(self.location.origin)) return;

  // 4. Network-first con fallback a caché → si la red falla, sirve lo cacheado
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Guardar copia fresca en caché si fue exitosa
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // Fallback final: devolver el index.html (SPA)
          return caches.match('/paladeartienda/index.html');
        });
      })
  );
});

// ── PUSH: placeholder para Fase 2 (OneSignal) ──────────
// Cuando integres OneSignal, este bloque lo maneja su SDK.
self.addEventListener('push', event => {
  // Sin OneSignal, no hacemos nada con pushes
  console.log('[SW] Push recibido (OneSignal no configurado aún)');
});

// ── NOTIFICATIONCLICK: placeholder ─────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/paladeartienda/')
  );
});
