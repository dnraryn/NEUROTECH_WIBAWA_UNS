/* Public static assets only. Auth, API requests, EEG and personal reports are
 * never stored in the service worker cache. Built releases replace these lines. */
const RELEASE = "development";
const STATIC_ASSETS = /* build:assets */ [];
const CACHE_PREFIX = "nt-worker-static-";
const CACHE = CACHE_PREFIX + RELEASE;
const allowed = new Set(STATIC_ASSETS);
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(STATIC_ASSETS)));
  // Wait for old windows to close, or an explicit safe update from the UI.
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys
    .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE).map((key) => caches.delete(key))))
    .then(() => self.clients.claim()));
});
self.addEventListener("message", (event) => {
  if (event.data?.type === "NT_APPLY_UPDATE") self.skipWaiting();
});
self.addEventListener("fetch", (event) => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.open(CACHE).then((cache) => cache.match("/offline.html"))));
    return;
  }
  if (!url.search && allowed.has(url.pathname)) {
    event.respondWith(caches.open(CACHE).then((cache) => cache.match(request)).then((cached) => cached || fetch(request)));
  }
});
