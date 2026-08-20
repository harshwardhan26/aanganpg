self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  // A minimal pass-through fetch handler is required by some browsers to qualify as a PWA
  // and trigger the beforeinstallprompt event.
  return;
});
