const CACHE_VERSION = "nextlevel-static-v6";
const STATIC_CACHE = `${CACHE_VERSION}-assets`;
const BADGE_CACHE = `${CACHE_VERSION}-badge`;
const BADGE_COUNT_URL = "/__nextlevel_app_badge_count";
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

function normalizeCount(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, Math.floor(value));
}

async function readStoredBadgeCount() {
  try {
    const cache = await caches.open(BADGE_CACHE);
    const response = await cache.match(BADGE_COUNT_URL);

    if (!response) {
      return 0;
    }

    const text = await response.text();
    return normalizeCount(Number(text)) ?? 0;
  } catch {
    return 0;
  }
}

async function writeStoredBadgeCount(count) {
  try {
    const cache = await caches.open(BADGE_CACHE);
    await cache.put(BADGE_COUNT_URL, new Response(String(count), { status: 200 }));
  } catch {
    // Ignore storage failures; badge API may still succeed.
  }
}

async function applyAppBadge(count) {
  try {
    if (count <= 0) {
      if (typeof self.registration.clearAppBadge === "function") {
        await self.registration.clearAppBadge();
      }

      await writeStoredBadgeCount(0);
      return;
    }

    if (typeof self.registration.setAppBadge === "function") {
      await self.registration.setAppBadge(count);
    }

    await writeStoredBadgeCount(count);
  } catch {
    // Badge API unsupported or failed — never break push display.
  }
}

async function updateAppBadgeFromPayload(payload) {
  const unreadCount = normalizeCount(payload.unreadCount);

  if (unreadCount !== null) {
    await applyAppBadge(unreadCount);
    return;
  }

  const badgeDelta = normalizeCount(payload.badgeDelta);

  if (badgeDelta === null || badgeDelta <= 0) {
    return;
  }

  const current = await readStoredBadgeCount();
  await applyAppBadge(current + badgeDelta);
}

function parsePushPayload(rawData) {
  if (!rawData) {
    return {
      title: "Nextlevel",
      body: "",
      url: "/dashboard",
      tag: "nextlevel-notification",
      unreadCount: null,
      badgeDelta: null,
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
      unreadCount: normalizeCount(payload.unreadCount ?? payload.data?.unreadCount),
      badgeDelta: normalizeCount(payload.badgeDelta ?? payload.data?.badgeDelta),
    };
  } catch {
    return {
      title: "Nextlevel",
      body: "",
      url: "/dashboard",
      tag: "nextlevel-notification",
      unreadCount: null,
      badgeDelta: null,
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
          .filter(
            (cacheName) =>
              cacheName.startsWith("nextlevel-static-") &&
              cacheName !== STATIC_CACHE &&
              cacheName !== BADGE_CACHE,
          )
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

      await updateAppBadgeFromPayload(payload);

      await self.registration.showNotification(payload.title, {
        body: payload.body,
        icon: NOTIFICATION_ICON,
        badge: NOTIFICATION_BADGE,
        tag: payload.tag,
        renotify: false,
        data: {
          url: payload.url,
          unreadCount: payload.unreadCount,
          badgeDelta: payload.badgeDelta,
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
