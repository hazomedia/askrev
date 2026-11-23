// ASKR EV Minimal PWA Service Worker
// STRICT COMPLIANCE: NEVER cache or intercept sensitive APIs, wallets, payments, auth tokens, or admin responses.

const CACHE_NAME = 'askrev-pwa-shell-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Strictly bypass ALL API, Admin, Auth, Wallet, and Payment endpoints
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/auth') ||
    url.pathname.startsWith('/wallet') ||
    url.pathname.startsWith('/payments') ||
    url.searchParams.has('token') ||
    event.request.method !== 'GET' ||
    event.request.headers.has('Authorization')
  ) {
    // Direct network pass-through; never cache or inspect
    return;
  }

  // 2. Safe network-first fetch for static public assets; never cache sensitive data
  event.respondWith(
    fetch(event.request).catch(() => {
      // Offline fallback only for navigation
      if (event.request.mode === 'navigate') {
        return caches.match('/dashboard') || Response.error();
      }
      return Response.error();
    })
  );
});
