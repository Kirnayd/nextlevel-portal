import "server-only";

import type { User } from "@supabase/supabase-js";
import webpush from "web-push";

import { createAdminClient } from "@/infrastructure/supabase/admin";
import {
  type PushNotificationPayload,
  serializePushPayload,
  validatePushPayload,
} from "@/infrastructure/push/payload";
import { configureWebPush, isPushConfigured } from "@/infrastructure/push/vapid";

const SUBSCRIPTION_BATCH_SIZE = 200;
const SEND_CONCURRENCY = 10;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

export type PushSendSummary = {
  sent: number;
  failed: number;
  removedExpired: number;
};

type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

type PushFailureCategory =
  | "vapid-mismatch"
  | "expired"
  | "invalid-request"
  | "network"
  | "configuration"
  | "unknown";

type PushDeliveryFailure = {
  name: string;
  statusCode: number | null;
  message: string;
  body: string | null;
  category: PushFailureCategory;
};

type PushSendOptions = {
  eventType?: string;
};

type SubscriptionSendResult = {
  outcome: "sent" | "failed" | "expired";
  failure?: PushDeliveryFailure;
};

type WebPushErrorLike = {
  name: string;
  message: string;
  statusCode?: number;
  body?: string | Buffer;
};

function sanitizePushErrorMessage(message: string): string {
  return message
    .replace(/https?:\/\/[^\s]+/g, "[redacted-url]")
    .replace(/[A-Za-z0-9+/=_-]{80,}/g, "[redacted-token]")
    .trim()
    .slice(0, 300);
}

function sanitizePushErrorBody(body: string): string {
  return sanitizePushErrorMessage(body).slice(0, 500);
}

function isWebPushError(error: unknown): error is WebPushErrorLike {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name: string }).name === "WebPushError" &&
    "statusCode" in error &&
    typeof (error as { statusCode: unknown }).statusCode === "number"
  );
}

function categorizePushFailure(
  statusCode: number | null,
  name: string,
  message: string,
): PushFailureCategory {
  if (statusCode === 401 || statusCode === 403) {
    return "vapid-mismatch";
  }

  if (statusCode === 404 || statusCode === 410) {
    return "expired";
  }

  if (statusCode === 400) {
    return "invalid-request";
  }

  if (
    /vapid|vapidDetails|public key|private key|subject/i.test(message) ||
    name === "ConfigurationError"
  ) {
    return "configuration";
  }

  if (
    /socket timeout|ECONNRESET|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|network|fetch failed/i.test(
      message,
    )
  ) {
    return "network";
  }

  return "unknown";
}

function extractWebPushError(error: unknown): PushDeliveryFailure {
  if (isWebPushError(error)) {
    const body =
      typeof error.body === "string"
        ? sanitizePushErrorBody(error.body)
        : Buffer.isBuffer(error.body)
          ? sanitizePushErrorBody(error.body.toString("utf8"))
          : null;

    const message = sanitizePushErrorMessage(error.message || "WebPushError");

    return {
      name: error.name,
      statusCode: error.statusCode ?? null,
      message,
      body,
      category: categorizePushFailure(error.statusCode ?? null, error.name, message),
    };
  }

  if (error instanceof Error) {
    const message = sanitizePushErrorMessage(error.message || "Unknown push delivery error");

    return {
      name: error.name || "Error",
      statusCode: null,
      message,
      body: null,
      category: categorizePushFailure(null, error.name, message),
    };
  }

  return {
    name: "UnknownError",
    statusCode: null,
    message: "Unknown push delivery error",
    body: null,
    category: "unknown",
  };
}

function logPushFailure(eventType: string, failure: PushDeliveryFailure): void {
  console.error("[push] delivery failed", {
    eventType,
    name: failure.name,
    statusCode: failure.statusCode,
    message: failure.message,
    body: failure.body,
    category: failure.category,
  });
}

function logPushDeliveryDiagnostics(params: {
  eventType: string;
  recipientCount: number;
  subscriptionsFound: number;
  summary: PushSendSummary;
  failures: PushDeliveryFailure[];
}): void {
  const payload = {
    eventType: params.eventType,
    recipientCount: params.recipientCount,
    subscriptionsFound: params.subscriptionsFound,
    sent: params.summary.sent,
    failed: params.summary.failed,
    removedExpired: params.summary.removedExpired,
    failures: params.failures.map((failure) => ({
      name: failure.name,
      statusCode: failure.statusCode,
      message: failure.message,
      body: failure.body,
      category: failure.category,
    })),
  };

  if (params.summary.failed > 0) {
    console.error("[push] delivery completed with failures", payload);
    return;
  }

  console.info("[push] delivery completed", payload);
}

function isValidBase64Url(value: string): boolean {
  return BASE64URL_PATTERN.test(value) && value.length > 0;
}

function buildWebPushSubscription(
  subscription: PushSubscriptionRow,
): webpush.PushSubscription | null {
  const endpoint = subscription.endpoint.trim();
  const p256dh = subscription.p256dh.trim();
  const auth = subscription.auth.trim();

  if (!endpoint.startsWith("https://")) {
    return null;
  }

  if (!isValidBase64Url(p256dh) || !isValidBase64Url(auth)) {
    return null;
  }

  return {
    endpoint,
    keys: {
      p256dh,
      auth,
    },
  };
}

function isAuthUserBlocked(user: User): boolean {
  if (!user.banned_until) {
    return false;
  }

  return new Date(user.banned_until).getTime() > Date.now();
}

async function getActiveEmployeeIds(): Promise<string[]> {
  const admin = createAdminClient();

  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "employee");

  if (error) {
    console.error("Failed to load employee profiles for push:", error.message);
    return [];
  }

  const employeeIds = (profiles ?? []).map((profile) => (profile as { id: string }).id);
  const activeIds: string[] = [];

  for (const userId of employeeIds) {
    const { data, error: userError } = await admin.auth.admin.getUserById(userId);

    if (userError || !data.user || isAuthUserBlocked(data.user)) {
      continue;
    }

    activeIds.push(userId);
  }

  return activeIds;
}

async function getActiveAdminIds(): Promise<string[]> {
  const admin = createAdminClient();

  const { data: profiles, error } = await admin.from("profiles").select("id").eq("role", "admin");

  if (error) {
    console.error("[push] Failed to load admin profiles", {
      stage: "find_admins",
      code: error.code ?? null,
      message: error.message,
    });
    return [];
  }

  const adminIds = (profiles ?? []).map((profile) => (profile as { id: string }).id);
  const activeIds: string[] = [];

  for (const userId of adminIds) {
    const { data, error: userError } = await admin.auth.admin.getUserById(userId);

    if (userError || !data.user || isAuthUserBlocked(data.user)) {
      continue;
    }

    activeIds.push(userId);
  }

  console.info("[push] Active administrators resolved", {
    stage: "find_admins",
    administratorsFoundCount: adminIds.length,
    activeAdministratorIdsCount: activeIds.length,
  });

  if (adminIds.length === 0) {
    console.error("[push] Configuration error: zero administrators found", {
      stage: "find_admins",
    });
  }

  return activeIds;
}

async function loadSubscriptionsForUsers(userIds: string[]): Promise<PushSubscriptionRow[]> {
  if (userIds.length === 0) {
    return [];
  }

  const admin = createAdminClient();
  const subscriptions: PushSubscriptionRow[] = [];

  for (let index = 0; index < userIds.length; index += SUBSCRIPTION_BATCH_SIZE) {
    const batch = userIds.slice(index, index + SUBSCRIPTION_BATCH_SIZE);

    const { data, error } = await admin
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth")
      .in("user_id", batch);

    if (error) {
      console.error("Failed to load push subscriptions:", error.message);
      continue;
    }

    subscriptions.push(...((data ?? []) as PushSubscriptionRow[]));
  }

  return subscriptions;
}

async function removeExpiredSubscription(subscriptionId: string): Promise<void> {
  const admin = createAdminClient();

  const { error } = await admin.from("push_subscriptions").delete().eq("id", subscriptionId);

  if (error) {
    console.error("Failed to remove expired push subscription:", error.message);
  }
}

async function sendToSubscription(
  subscription: PushSubscriptionRow,
  payload: PushNotificationPayload,
  eventType: string,
): Promise<SubscriptionSendResult> {
  const pushSubscription = buildWebPushSubscription(subscription);

  if (!pushSubscription) {
    const failure: PushDeliveryFailure = {
      name: "InvalidSubscription",
      statusCode: null,
      message: "Invalid subscription structure or base64url keys.",
      body: null,
      category: "invalid-request",
    };

    logPushFailure(eventType, failure);
    return { outcome: "failed", failure };
  }

  try {
    await webpush.sendNotification(pushSubscription, serializePushPayload(payload));
    return { outcome: "sent" };
  } catch (error) {
    const failure = extractWebPushError(error);

    if (failure.statusCode === 404 || failure.statusCode === 410) {
      await removeExpiredSubscription(subscription.id);
      return { outcome: "expired" };
    }

    logPushFailure(eventType, failure);
    return { outcome: "failed", failure };
  }
}

async function sendToSubscriptions(
  subscriptions: PushSubscriptionRow[],
  payload: PushNotificationPayload,
  context: { eventType: string; recipientCount: number },
): Promise<PushSendSummary> {
  const summary: PushSendSummary = {
    sent: 0,
    failed: 0,
    removedExpired: 0,
  };
  const failures: PushDeliveryFailure[] = [];

  try {
    configureWebPush();
  } catch (error) {
    const failure = extractWebPushError(error);
    failure.category = "configuration";
    logPushFailure(context.eventType, failure);

    return {
      sent: 0,
      failed: subscriptions.length,
      removedExpired: 0,
    };
  }

  for (let index = 0; index < subscriptions.length; index += SEND_CONCURRENCY) {
    const batch = subscriptions.slice(index, index + SEND_CONCURRENCY);
    const results = await Promise.all(
      batch.map((subscription) => sendToSubscription(subscription, payload, context.eventType)),
    );

    for (const result of results) {
      if (result.outcome === "sent") {
        summary.sent += 1;
      } else if (result.outcome === "expired") {
        summary.removedExpired += 1;
      } else {
        summary.failed += 1;

        if (result.failure) {
          failures.push(result.failure);
        }
      }
    }
  }

  logPushDeliveryDiagnostics({
    eventType: context.eventType,
    recipientCount: context.recipientCount,
    subscriptionsFound: subscriptions.length,
    summary,
    failures,
  });

  return summary;
}

export async function sendPushToUsers(
  userIds: string[],
  payload: PushNotificationPayload,
  options?: PushSendOptions,
): Promise<PushSendSummary> {
  const eventType = options?.eventType ?? "unknown";
  const validatedPayload = validatePushPayload(payload);

  if (!validatedPayload) {
    console.error("[push] invalid payload", { eventType, recipientCount: userIds.length });
    return { sent: 0, failed: 0, removedExpired: 0 };
  }

  if (!isPushConfigured()) {
    console.error("[push] VAPID is not configured on the server", {
      eventType,
      recipientCount: userIds.length,
    });
    return { sent: 0, failed: 0, removedExpired: 0 };
  }

  if (userIds.length === 0) {
    console.info("[push] no recipients", {
      eventType,
      recipientCount: 0,
      subscriptionsFound: 0,
      sent: 0,
      failed: 0,
      removedExpired: 0,
      failures: [],
    });
    return { sent: 0, failed: 0, removedExpired: 0 };
  }

  const uniqueUserIds = [...new Set(userIds)];
  const subscriptions = await loadSubscriptionsForUsers(uniqueUserIds);

  if (subscriptions.length === 0) {
    console.info("[push] no subscriptions for recipients", {
      eventType,
      recipientCount: uniqueUserIds.length,
      subscriptionsFound: 0,
      sent: 0,
      failed: 0,
      removedExpired: 0,
      failures: [],
    });
    return { sent: 0, failed: 0, removedExpired: 0 };
  }

  return sendToSubscriptions(subscriptions, validatedPayload, {
    eventType,
    recipientCount: uniqueUserIds.length,
  });
}

export async function sendPushToUser(
  userId: string,
  payload: PushNotificationPayload,
  options?: PushSendOptions,
): Promise<PushSendSummary> {
  return sendPushToUsers([userId], payload, options);
}

export async function sendPushToAllEmployees(
  payload: PushNotificationPayload,
  options?: PushSendOptions,
): Promise<PushSendSummary> {
  const employeeIds = await getActiveEmployeeIds();
  return sendPushToUsers(employeeIds, payload, options);
}

export async function sendPushToAllAdmins(
  payload: PushNotificationPayload,
  options?: PushSendOptions & { excludeUserId?: string },
): Promise<PushSendSummary> {
  const adminIds = (await getActiveAdminIds()).filter(
    (userId) => userId !== options?.excludeUserId,
  );
  return sendPushToUsers(adminIds, payload, options);
}

export const PUSH_DELIVERY_WARNING =
  "Дані збережено, але частину сповіщень не вдалося доставити.";

export function getPushWarningFromSummary(summary: PushSendSummary): string | undefined {
  if (summary.failed > 0) {
    return PUSH_DELIVERY_WARNING;
  }

  return undefined;
}
