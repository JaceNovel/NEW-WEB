const CACHE_NAME = "king-league-shell-v2";
const APP_SHELL = ["/", "/manifest.webmanifest"];

function shouldBypassCache(url) {
  if (url.pathname.startsWith("/api/")) return true;

  return ["/admin", "/credits", "/profile", "/historique", "/matchs", "/classement"].some(
    (segment) => url.pathname === segment || url.pathname.startsWith(`${segment}/`),
  );
}

function shouldCacheAsset(request, url) {
  if (request.mode === "navigate") return false;
  if (shouldBypassCache(url)) return false;

  return /\.(?:js|css|png|jpg|jpeg|webp|svg|ico|woff2?|ttf|eot|json|webmanifest)$/i.test(url.pathname);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (shouldBypassCache(requestUrl)) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match("/"))),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic" || !shouldCacheAsset(event.request, requestUrl)) {
          return response;
        }

        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        return response;
      });
    }),
  );
});