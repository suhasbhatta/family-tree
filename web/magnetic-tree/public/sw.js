self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  // Family data must never enter a service-worker cache. Keep the PWA shell
  // installable while all responses remain network-only.
  event.respondWith(fetch(event.request));
});
