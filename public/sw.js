const CACHE_VERSION = "nextlevel-static-v5";
const STATIC_CACHE = `${CACHE_VERSION}-assets`;
const NOTIFICATION_ICON = "/icons/icon-192.png";
const NOTIFICATION_BADGE = "/icons/icon-192.png";

const NEVER_CACHE_PATH_PREFIXES = ["/api/"];

const ALLOWED_NOTIFICATION_ROUTES = new Set([
  "/announcements",
  "/price",
  "/documents",
  "/questions",
  "/dashboard",
]);

function shouldNeverCache(url) {
  if (url.origin !== self.location.origin) {
    return true;
  }

  return NEVER_CACHE_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/pdf.worker.min.mjs" ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname.endsWith(".woff2")
  );
}

function sanitizeNotificationRoute(value) {
  if (typeof value !== "string") {
    return "/dashboard";
  }

  const trimmed = value.trim();

  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return "/dashboard";
  }

  const pathname = trimmed.split("?")[0]?.split("#")[0] ?? "/dashboard";

  if (!ALLOWED_NOTIFICATION_ROUTES.has(pathname)) {
    return "/dashboard";
  }

  return pathname;
}

function parsePushPayload(rawData) {
  if (!rawData) {
    return {
      title: "Nextlevel",
      body: "",
      url: "/dashboard",
      tag: "nextlevel-notification",
    };
  }

  try {
    const text = rawData.text();
    const payload = JSON.parse(text);

    return {
      title: typeof payload.title === "string" ? payload.title.slice(0, 100) : "Nextlevel",
      body: typeof payload.body === "string" ? payload.body.slice(0, 200) : "",
      url: sanitizeNotificationRoute(payload.url ?? payload.data?.url),
      tag:
        typeof payload.tag === "string"
          ? payload.tag.slice(0, 64)
          : sanitizeNotificationRoute(payload.url ?? payload.data?.url),
    };
  } catch {
    return {
      title: "Nextlevel",
      body: "",
      url: "/dashboard",
      tag: "nextlevel-notification",
    };
  }
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

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      const payload = parsePushPayload(event.data);

      await self.registration.showNotification(payload.title, {
        body: payload.body,
        icon: NOTIFICATION_ICON,
        badge: NOTIFICATION_BADGE,
        tag: payload.tag,
        renotify: false,
        data: {
          url: payload.url,
        },
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = sanitizeNotificationRoute(event.notification.data?.url);

  event.waitUntil(
    (async () => {
      const windowClients = await clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of windowClients) {
        if ("focus" in client) {
          await client.focus();

          if ("navigate" in client) {
            await client.navigate(targetUrl);
          }

          return;
        }
      }

      await clients.openWindow(targetUrl);
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
        void fetch(request)
          .then((networkResponse) => {
            if (networkResponse.ok) {
              void cache.put(request, networkResponse.clone());
            }
          })
          .catch(() => undefined);

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
