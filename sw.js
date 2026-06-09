// VQ Universal Service Worker
// Works for ALL businesses automatically
// Version — update this number when you want to force a refresh
const VERSION = 'vq-1.0';

// ── INSTALL ─────────────────────────────────────────────────────
// Cache the Firebase SDKs and Google Fonts so app loads offline
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(VERSION).then(cache => {
      return cache.addAll([
        'https://cdnjs.cloudflare.com/ajax/libs/firebase/9.23.0/firebase-app-compat.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/firebase/9.23.0/firebase-database-compat.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
      ]).catch(() => {
        // Ignore cache failures for external resources
      });
    })
  );
  self.skipWaiting();
});

// ── ACTIVATE ────────────────────────────────────────────────────
// Clean up old caches from previous versions
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== VERSION).map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── FETCH ────────────────────────────────────────────────────────
// Network first for HTML pages (always get latest)
// Cache first for CDN assets (faster load)
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET requests and Firebase API calls
  if (event.request.method !== 'GET') return;
  if (url.hostname.includes('firebaseio.com')) return;
  if (url.hostname.includes('googleapis.com') && url.pathname.includes('/v1/')) return;

  // CDN assets → cache first
  if (url.hostname.includes('cdnjs.cloudflare.com') || 
      url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        return cached || fetch(event.request).then(response => {
          const clone = response.clone();
          caches.open(VERSION).then(cache => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  // HTML pages → network first, fallback to cache with offline message
  if (url.hostname.includes('vqueue.io') || url.protocol === 'file:') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache successful response
          const clone = response.clone();
          caches.open(VERSION).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          // Offline — return cached version
          return caches.match(event.request).then(cached => {
            if (cached) return cached;
            // No cache — show offline page
            return new Response(offlinePage(), {
              headers: { 'Content-Type': 'text/html' }
            });
          });
        })
    );
  }
});

// ── OFFLINE PAGE ─────────────────────────────────────────────────
function offlinePage() {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>No Connection</title>
<style>
  body{font-family:sans-serif;background:#1B2BA6;color:white;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:2rem;}
  .icon{font-size:64px;margin-bottom:1rem;}
  h1{font-size:24px;margin-bottom:.5rem;}
  p{opacity:.7;font-size:15px;line-height:1.6;max-width:300px;}
  button{margin-top:2rem;padding:14px 28px;background:#E81515;color:white;border:none;border-radius:10px;font-size:16px;font-weight:600;cursor:pointer;}
</style>
</head>
<body>
  <div class="icon">📶</div>
  <h1>No Connection</h1>
  <p>Please check your internet connection and try again. Your queue position is saved.</p>
  <button onclick="location.reload()">Try Again</button>
</body>
</html>`;
}
