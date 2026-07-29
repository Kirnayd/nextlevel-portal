import "server-only";

import webpush from "web-push";

let isConfigured = false;

function normalizeVapidKey(key: string): string {
  return key
    .trim()
    .replace(/^\uFEFF/, "")
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, "")
    .replace(/=+$/g, "");
}

function normalizeVapidSubject(subject: string): string {
  return subject.trim().replace(/^["']|["']$/g, "");
}

function assertVapidKeyLengths(publicKey: string, privateKey: string): void {
  const publicBytes = Buffer.from(publicKey, "base64url");
  const privateBytes = Buffer.from(privateKey, "base64url");

  if (publicBytes.length !== 65) {
    throw new Error(`Invalid VAPID public key length: ${publicBytes.length} bytes (expected 65).`);
  }

  if (privateBytes.length !== 32) {
    throw new Error(`Invalid VAPID private key length: ${privateBytes.length} bytes (expected 32).`);
  }
}

export function configureWebPush(): void {
  if (isConfigured) {
    return;
  }

  const publicKey = normalizeVapidKey(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "");
  const privateKey = normalizeVapidKey(process.env.VAPID_PRIVATE_KEY ?? "");
  const subject = normalizeVapidSubject(process.env.VAPID_SUBJECT ?? "");

  if (!publicKey || !privateKey || !subject) {
    throw new Error(
      "Missing Web Push environment variables. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT.",
    );
  }

  assertVapidKeyLengths(publicKey, privateKey);
  webpush.setVapidDetails(subject, publicKey, privateKey);
  isConfigured = true;
}

export function getPublicVapidKey(): string | null {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  if (!publicKey) {
    return null;
  }

  return normalizeVapidKey(publicKey);
}

export function isPushConfigured(): boolean {
  try {
    const publicKey = normalizeVapidKey(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "");
    const privateKey = normalizeVapidKey(process.env.VAPID_PRIVATE_KEY ?? "");
    const subject = normalizeVapidSubject(process.env.VAPID_SUBJECT ?? "");

    return Boolean(publicKey && privateKey && subject);
  } catch {
    return false;
  }
}
