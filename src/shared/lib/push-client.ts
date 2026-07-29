export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const normalized = base64String
    .trim()
    .replace(/^\uFEFF/, "")
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, "");

  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  const base64 = (normalized + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

export function isPushApiSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function isIosDevice(): boolean {
  const userAgent = window.navigator.userAgent;
  const isClassicIos = /iPad|iPhone|iPod/.test(userAgent);
  const isIpadOs =
    window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1;

  return isClassicIos || isIpadOs;
}

export function isStandalonePwa(): boolean {
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  );
}

export function isIosSafariNotInstalled(): boolean {
  if (!isIosDevice()) {
    return false;
  }

  const userAgent = window.navigator.userAgent;
  const isSafari =
    /Safari/.test(userAgent) &&
    !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome|Chromium|CriOS/.test(userAgent);

  return isSafari && !isStandalonePwa();
}

export async function waitForServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) {
    return null;
  }

  return navigator.serviceWorker.ready;
}

export function subscriptionToPayload(subscription: PushSubscription) {
  const json = subscription.toJSON();
  const endpoint = json.endpoint;
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    return null;
  }

  return {
    endpoint,
    p256dh,
    auth,
    userAgent: window.navigator.userAgent,
  };
}
