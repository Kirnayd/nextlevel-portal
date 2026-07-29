"use server";

import { createClient } from "@/infrastructure/supabase/server";
import { getPublicVapidKey } from "@/infrastructure/push/vapid";
import { getAuthenticatedUser } from "@/shared/lib/auth";
import type { TablesInsert } from "@/shared/types/database.types";

type PushActionResult = { success: true } | { success: false; error: string };

const ENDPOINT_MAX_LENGTH = 2048;
const KEY_MAX_LENGTH = 512;
const USER_AGENT_MAX_LENGTH = 512;

function validateSubscriptionInput(input: {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}): string | null {
  const endpoint = input.endpoint.trim();
  const p256dh = input.p256dh.trim();
  const auth = input.auth.trim();

  if (!endpoint || endpoint.length > ENDPOINT_MAX_LENGTH) {
    return "Некоректна push-підписка.";
  }

  if (!endpoint.startsWith("https://")) {
    return "Некоректна push-підписка.";
  }

  if (!p256dh || p256dh.length > KEY_MAX_LENGTH) {
    return "Некоректні ключі push-підписки.";
  }

  if (!auth || auth.length > KEY_MAX_LENGTH) {
    return "Некоректні ключі push-підписки.";
  }

  if (input.userAgent && input.userAgent.length > USER_AGENT_MAX_LENGTH) {
    return "Некоректний user agent.";
  }

  return null;
}

export async function savePushSubscription(input: {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}): Promise<PushActionResult> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: "Увійдіть у систему." };
  }

  const validationError = validateSubscriptionInput(input);

  if (validationError) {
    return { success: false, error: validationError };
  }

  const supabase = await createClient();
  const payload: TablesInsert<"push_subscriptions"> = {
    user_id: user.id,
    endpoint: input.endpoint.trim(),
    p256dh: input.p256dh.trim(),
    auth: input.auth.trim(),
    user_agent: input.userAgent?.trim().slice(0, USER_AGENT_MAX_LENGTH) ?? null,
  };

  const { error } = await supabase.from("push_subscriptions").upsert(payload as never, {
    onConflict: "user_id,endpoint",
  });

  if (error) {
    console.error("Failed to save push subscription:", error.message);
    return { success: false, error: "Не вдалося зберегти push-підписку." };
  }

  return { success: true };
}

export async function removePushSubscription(endpoint: string): Promise<PushActionResult> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: "Увійдіть у систему." };
  }

  const normalizedEndpoint = endpoint.trim();

  if (!normalizedEndpoint || normalizedEndpoint.length > ENDPOINT_MAX_LENGTH) {
    return { success: false, error: "Некоректна push-підписка." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", normalizedEndpoint);

  if (error) {
    console.error("Failed to remove push subscription:", error.message);
    return { success: false, error: "Не вдалося видалити push-підписку." };
  }

  return { success: true };
}

export async function getPublicPushVapidKey(): Promise<string | null> {
  return getPublicVapidKey();
}
