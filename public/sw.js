const CACHE_VERSION = "nextlevel-static-v1";
const STATIC_CACHE = `${CACHE_VERSION}-assets`;

const NEVER_CACHE_PATH_PREFIXES = ["/api/"];
const NEVER_CACHE_HOST_SUFFIXES = ["supabase.co", "supabase.in"];

function shouldNeverCache(url) {
  if (url.origin !== self.location.origin) {
    if (NEVER_CACHE_HOST_SUFFIXES.some((suffix) => url.hostname.endsWith(suffix))) {
      return true;
    }

    return true;
  }

  return NEVER_CACHE_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.endsWith(".woff2")
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();

      await Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith("nextlevel-static-") && cacheName !== STATIC_CACHE)
          .map((cacheName) => caches.delete(cacheName)),
      );

      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (shouldNeverCache(url)) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(fetch(request));
    return;
  }

  if (!isStaticAsset(url)) {
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      const cachedResponse = await cache.match(request);

      if (cachedResponse) {
        return cachedResponse;
      }

      const networkResponse = await fetch(request);

      if (networkResponse.ok) {
        await cache.put(request, networkResponse.clone());
      }

      return networkResponse;
    })(),
  );
});
