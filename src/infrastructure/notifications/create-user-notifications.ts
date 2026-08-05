import "server-only";

import type { User } from "@supabase/supabase-js";

import { createAdminClient } from "@/infrastructure/supabase/admin";
import { createClient } from "@/infrastructure/supabase/server";
import { getAuthenticatedUser } from "@/shared/lib/auth";

const INSERT_BATCH_SIZE = 100;

export type UserNotificationType =
  | "announcement"
  | "price"
  | "document"
  | "question_answer"
  | "question_message";

export type UserNotificationPayload = {
  type: UserNotificationType;
  title: string;
  body?: string | null;
  url: string;
  entity_id?: string | null;
  event_key: string;
};

export type UserNotificationRow = {
  id: string;
  user_id: string;
  type: UserNotificationType;
  title: string;
  body: string | null;
  url: string;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
  event_key: string | null;
};

function isInternalUrl(url: string): boolean {
  return url.startsWith("/") && !url.startsWith("//");
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
    console.error("Failed to load employee profiles for notifications:", error.message);
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
    console.error("Failed to load admin profiles for notifications:", error.message);
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

  return activeIds;
}

function buildInsertRow(userId: string, payload: UserNotificationPayload) {
  return {
    user_id: userId,
    type: payload.type,
    title: payload.title,
    body: payload.body ?? null,
    url: payload.url,
    entity_id: payload.entity_id ?? null,
    event_key: payload.event_key,
  };
}

async function insertNotificationBatch(
  rows: ReturnType<typeof buildInsertRow>[],
): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  const admin = createAdminClient();

  for (let index = 0; index < rows.length; index += INSERT_BATCH_SIZE) {
    const batch = rows.slice(index, index + INSERT_BATCH_SIZE);

    const { error } = await admin
      .from("user_notifications")
      .upsert(batch as never, { onConflict: "user_id,event_key", ignoreDuplicates: true });

    if (error) {
      console.error("Failed to insert user notifications batch:", error.message);
    }
  }
}

export async function createNotificationsForEmployees(payload: UserNotificationPayload): Promise<void> {
  if (!isInternalUrl(payload.url)) {
    console.error("Skipped employee notifications: invalid internal url");
    return;
  }

  try {
    const employeeIds = await getActiveEmployeeIds();

    if (employeeIds.length === 0) {
      return;
    }

    const rows = employeeIds.map((userId) => buildInsertRow(userId, payload));
    await insertNotificationBatch(rows);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to create employee notifications:", message);
  }
}

export async function createNotificationsForAdmins(
  payload: UserNotificationPayload,
  options?: { excludeUserId?: string },
): Promise<void> {
  if (!isInternalUrl(payload.url)) {
    console.error("Skipped admin notifications: invalid internal url");
    return;
  }

  try {
    const adminIds = (await getActiveAdminIds()).filter(
      (userId) => userId !== options?.excludeUserId,
    );

    if (adminIds.length === 0) {
      return;
    }

    const rows = adminIds.map((userId) => buildInsertRow(userId, payload));
    await insertNotificationBatch(rows);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to create admin notifications:", message);
  }
}

export async function createNotificationsForAdminsWithPerUserEventKeys(
  base: Omit<UserNotificationPayload, "event_key">,
  buildEventKey: (adminId: string) => string,
  options?: { excludeUserId?: string },
): Promise<void> {
  if (!isInternalUrl(base.url)) {
    console.error("Skipped admin notifications: invalid internal url");
    return;
  }

  try {
    const adminIds = (await getActiveAdminIds()).filter(
      (userId) => userId !== options?.excludeUserId,
    );

    if (adminIds.length === 0) {
      return;
    }

    const rows = adminIds.map((userId) =>
      buildInsertRow(userId, {
        ...base,
        event_key: buildEventKey(userId),
      }),
    );
    await insertNotificationBatch(rows);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to create per-admin notifications:", message);
  }
}

export async function createNotificationForUser(
  userId: string,
  payload: UserNotificationPayload,
): Promise<void> {
  if (!userId || !isInternalUrl(payload.url)) {
    console.error("Skipped user notification: invalid recipient or url");
    return;
  }

  try {
    const admin = createAdminClient();

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, role")
      .eq("id", userId)
      .maybeSingle();

    if (profileError || !profile) {
      console.error("Skipped user notification: recipient profile not found");
      return;
    }

    const { data: authData, error: authError } = await admin.auth.admin.getUserById(userId);

    if (authError || !authData.user || isAuthUserBlocked(authData.user)) {
      console.error("Skipped user notification: recipient inactive or blocked");
      return;
    }

    await insertNotificationBatch([buildInsertRow(userId, payload)]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to create user notification:", message);
  }
}

export async function markNotificationRead(
  notificationId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: "Увійдіть у систему." };
  }

  if (!notificationId) {
    return { success: false, error: "Сповіщення не знайдено." };
  }

  const supabase = await createClient();
  const readAt = new Date().toISOString();

  const { data, error } = await supabase
    .from("user_notifications")
    .update({ is_read: true, read_at: readAt } as never)
    .eq("id", notificationId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Failed to mark notification read:", error.message);
    return { success: false, error: "Не вдалося позначити сповіщення прочитаним." };
  }

  if (!data) {
    return { success: false, error: "Сповіщення не знайдено." };
  }

  return { success: true };
}

export async function markAllNotificationsRead(): Promise<
  { success: true } | { success: false; error: string }
> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: "Увійдіть у систему." };
  }

  const supabase = await createClient();
  const readAt = new Date().toISOString();

  const { error } = await supabase
    .from("user_notifications")
    .update({ is_read: true, read_at: readAt } as never)
    .eq("user_id", user.id)
    .eq("is_read", false);

  if (error) {
    console.error("Failed to mark all notifications read:", error.message);
    return { success: false, error: "Не вдалося позначити всі сповіщення прочитаними." };
  }

  return { success: true };
}

export async function getUnreadNotificationCount(): Promise<number> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return 0;
  }

  const supabase = await createClient();

  const { count, error } = await supabase
    .from("user_notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  if (error) {
    console.error("Failed to count unread notifications:", error.message);
    return 0;
  }

  return count ?? 0;
}

export async function getUserNotifications(
  limit: number,
  offset: number,
): Promise<{ notifications: UserNotificationRow[]; hasMore: boolean }> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return { notifications: [], hasMore: false };
  }

  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const safeOffset = Math.max(offset, 0);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_notifications")
    .select(
      "id, user_id, type, title, body, url, entity_id, is_read, created_at, read_at, event_key",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(safeOffset, safeOffset + safeLimit);

  if (error) {
    console.error("Failed to load user notifications:", error.message);
    return { notifications: [], hasMore: false };
  }

  const notifications = (data ?? []) as UserNotificationRow[];
  const hasMore = notifications.length > safeLimit;

  return {
    notifications: hasMore ? notifications.slice(0, safeLimit) : notifications,
    hasMore,
  };
}
