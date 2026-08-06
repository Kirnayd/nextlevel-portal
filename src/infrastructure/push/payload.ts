import "server-only";

const MAX_TITLE_LENGTH = 100;
const MAX_BODY_LENGTH = 200;
const MAX_TAG_LENGTH = 64;

const ALLOWED_ROUTES = new Set([
  "/announcements",
  "/price",
  "/documents",
  "/questions",
  "/dashboard",
]);

export type PushNotificationPayload = {
  title: string;
  body: string;
  url: string;
  tag?: string;
  renotify?: boolean;
  unreadCount?: number;
  badgeDelta?: number;
};

function normalizeOptionalCount(value: number | undefined): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  return Math.max(0, Math.floor(value));
}

export function validatePushPayload(payload: PushNotificationPayload): PushNotificationPayload | null {
  const title = payload.title.trim().slice(0, MAX_TITLE_LENGTH);
  const body = payload.body.trim().slice(0, MAX_BODY_LENGTH);
  const url = payload.url.trim();

  if (!title || !body || !url.startsWith("/") || url.startsWith("//")) {
    return null;
  }

  const pathname = url.split("?")[0]?.split("#")[0] ?? url;

  if (!ALLOWED_ROUTES.has(pathname)) {
    return null;
  }

  const tag = payload.tag?.trim().slice(0, MAX_TAG_LENGTH) || pathname;

  return {
    title,
    body,
    url: pathname,
    tag,
    renotify: payload.renotify ?? false,
    unreadCount: normalizeOptionalCount(payload.unreadCount),
    badgeDelta: normalizeOptionalCount(payload.badgeDelta),
  };
}

export function serializePushPayload(payload: PushNotificationPayload): string {
  const unreadCount = normalizeOptionalCount(payload.unreadCount);
  const badgeDelta = normalizeOptionalCount(payload.badgeDelta);

  return JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url,
    tag: payload.tag ?? payload.url,
    ...(unreadCount !== undefined ? { unreadCount } : {}),
    ...(badgeDelta !== undefined ? { badgeDelta } : {}),
    data: {
      url: payload.url,
      ...(unreadCount !== undefined ? { unreadCount } : {}),
      ...(badgeDelta !== undefined ? { badgeDelta } : {}),
    },
  });
}
