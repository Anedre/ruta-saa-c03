// Service worker de la versión web: guarda la app para usarla sin conexión.
// scripts/build-web.js reemplaza __VERSION__ y __FILES__ al armar www/.
const VERSION = "__VERSION__";
const FILES = __FILES__;
const CACHE = "ruta-saa-" + VERSION;

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("ruta-saa-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// la página pide activar la versión nueva cuando el usuario acepta recargar
self.addEventListener("message", e => { if (e.data === "skipWaiting") self.skipWaiting(); });
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return; // Cognito, AppSync y GitHub van directo a la red
  if (url.pathname.endsWith("/version.json")) return; // siempre fresco
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).catch(() => caches.match("./"))));
});
