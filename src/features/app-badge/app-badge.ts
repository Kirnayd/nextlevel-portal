"use client";

function normalizeCount(count: number): number | null {
  if (!Number.isFinite(count)) {
    return null;
  }

  return Math.max(0, Math.floor(count));
}

function isDev(): boolean {
  return process.env.NODE_ENV === "development";
}

function logBadge(message: string, details?: Record<string, unknown>): void {
  if (!isDev()) {
    return;
  }

  console.info(`[app-badge] ${message}`, details ?? {});
}

export function isAppBadgeSupported(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }

  return (
    typeof navigator.setAppBadge === "function" ||
    typeof navigator.clearAppBadge === "function"
  );
}

export async function setAppBadge(count: number): Promise<void> {
  const normalized = normalizeCount(count);

  if (normalized === null) {
    return;
  }

  if (normalized === 0) {
    await clearAppBadge();
    return;
  }

  if (typeof navigator === "undefined" || typeof navigator.setAppBadge !== "function") {
    logBadge("setAppBadge unsupported", { supported: false });
    return;
  }

  try {
    await navigator.setAppBadge(normalized);
    logBadge("setAppBadge", { supported: true, count: normalized });
  } catch {
    logBadge("setAppBadge failed", { supported: true, count: normalized });
  }
}

export async function clearAppBadge(): Promise<void> {
  if (typeof navigator === "undefined" || typeof navigator.clearAppBadge !== "function") {
    logBadge("clearAppBadge unsupported", { supported: false });
    return;
  }

  try {
    await navigator.clearAppBadge();
    logBadge("clearAppBadge", { supported: true });
  } catch {
    logBadge("clearAppBadge failed", { supported: true });
  }
}

export async function syncAppBadge(count: number): Promise<void> {
  const normalized = normalizeCount(count);

  if (normalized === null) {
    return;
  }

  if (normalized === 0) {
    await clearAppBadge();
    return;
  }

  await setAppBadge(normalized);
}
