/* Minimal service worker — enables installability + offline shell on supported browsers. */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  /* Network-first for app routes; extend with caches if needed. */
});
