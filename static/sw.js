const CACHE = "ewa-cache-v1";
const ASSETS = [
  "/", "/static/style.css", "/static/app.js", "/static/manifest.json"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  // 네트워크 우선, 실패 시 캐시
  e.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});
