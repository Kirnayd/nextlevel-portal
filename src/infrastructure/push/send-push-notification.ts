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
): Promise<"sent" | "failed" | "expired"> {
  try {
    configureWebPush();
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      serializePushPayload(payload),
    );

    return "sent";
  } catch (error) {
    const statusCode =
      typeof error === "object" &&
      error !== null &&
      "statusCode" in error &&
      typeof error.statusCode === "number"
        ? error.statusCode
        : null;

    if (statusCode === 404 || statusCode === 410) {
      await removeExpiredSubscription(subscription.id);
      return "expired";
    }

    console.error("Push delivery failed:", statusCode ?? "unknown");
    return "failed";
  }
}

async function sendToSubscriptions(
  subscriptions: PushSubscriptionRow[],
  payload: PushNotificationPayload,
): Promise<PushSendSummary> {
  const summary: PushSendSummary = {
    sent: 0,
    failed: 0,
    removedExpired: 0,
  };

  for (let index = 0; index < subscriptions.length; index += SEND_CONCURRENCY) {
    const batch = subscriptions.slice(index, index + SEND_CONCURRENCY);
    const results = await Promise.all(
      batch.map((subscription) => sendToSubscription(subscription, payload)),
    );

    for (const result of results) {
      if (result === "sent") {
        summary.sent += 1;
      } else if (result === "expired") {
        summary.removedExpired += 1;
      } else {
        summary.failed += 1;
      }
    }
  }

  return summary;
}

export async function sendPushToUsers(
  userIds: string[],
  payload: PushNotificationPayload,
): Promise<PushSendSummary> {
  const validatedPayload = validatePushPayload(payload);

  if (!validatedPayload || !isPushConfigured() || userIds.length === 0) {
    return { sent: 0, failed: 0, removedExpired: 0 };
  }

  const uniqueUserIds = [...new Set(userIds)];
  const subscriptions = await loadSubscriptionsForUsers(uniqueUserIds);

  return sendToSubscriptions(subscriptions, validatedPayload);
}

export async function sendPushToUser(
  userId: string,
  payload: PushNotificationPayload,
): Promise<PushSendSummary> {
  return sendPushToUsers([userId], payload);
}

export async function sendPushToAllEmployees(
  payload: PushNotificationPayload,
): Promise<PushSendSummary> {
  const employeeIds = await getActiveEmployeeIds();
  return sendPushToUsers(employeeIds, payload);
}

export const PUSH_DELIVERY_WARNING =
  "Дані збережено, але частину сповіщень не вдалося доставити.";

export function getPushWarningFromSummary(summary: PushSendSummary): string | undefined {
  if (summary.failed > 0) {
    return PUSH_DELIVERY_WARNING;
  }

  return undefined;
}
