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
    console.error("[notifications] Failed to load admin profiles", {
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

  console.info("[notifications] Active administrators resolved", {
    stage: "find_admins",
    administratorsFoundCount: adminIds.length,
    activeAdministratorIdsCount: activeIds.length,
  });

  if (adminIds.length > 0 && activeIds.length === 0) {
    console.error("[notifications] Configuration error: admin profiles exist but none are active", {
      stage: "find_admins",
      administratorsFoundCount: adminIds.length,
      activeAdministratorIdsCount: 0,
    });
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

export type NotificationInsertSummary = {
  recipientCount: number;
  insertedCount: number;
};

async function insertNotificationBatch(
  rows: ReturnType<typeof buildInsertRow>[],
): Promise<number> {
  if (rows.length === 0) {
    return 0;
  }

  const admin = createAdminClient();
  let insertedCount = 0;

  for (let index = 0; index < rows.length; index += INSERT_BATCH_SIZE) {
    const batch = rows.slice(index, index + INSERT_BATCH_SIZE);

    const { error } = await admin
      .from("user_notifications")
      .upsert(batch as never, { onConflict: "user_id,event_key", ignoreDuplicates: true });

    if (error) {
      console.error("[notifications] Failed to insert user notifications batch", {
        stage: "create_in_app",
        code: error.code ?? null,
        message: error.message,
        batchSize: batch.length,
      });
      continue;
    }

    // Upsert with ignoreDuplicates does not reliably return row counts; treat a
    // successful batch write as attempted recipient coverage for diagnostics.
    insertedCount += batch.length;
  }

  return insertedCount;
}

export async function createNotificationsForEmployees(
  payload: UserNotificationPayload,
): Promise<NotificationInsertSummary> {
  if (!isInternalUrl(payload.url)) {
    console.error("[notifications] Skipped employee notifications: invalid internal url", {
      stage: "create_in_app",
    });
    return { recipientCount: 0, insertedCount: 0 };
  }

  try {
    const employeeIds = await getActiveEmployeeIds();

    if (employeeIds.length === 0) {
      console.error("[notifications] No active employees found for notifications", {
        stage: "find_employees",
      });
      return { recipientCount: 0, insertedCount: 0 };
    }

    const rows = employeeIds.map((userId) => buildInsertRow(userId, payload));
    const insertedCount = await insertNotificationBatch(rows);

    console.info("[notifications] Employee in-app notifications created", {
      stage: "create_in_app",
      recipientCount: employeeIds.length,
      insertedCount,
      type: payload.type,
    });

    return { recipientCount: employeeIds.length, insertedCount };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[notifications] Failed to create employee notifications", {
      stage: "create_in_app",
      message,
    });
    return { recipientCount: 0, insertedCount: 0 };
  }
}

export async function createNotificationsForAdmins(
  payload: UserNotificationPayload,
  options?: { excludeUserId?: string },
): Promise<NotificationInsertSummary> {
  if (!isInternalUrl(payload.url)) {
    console.error("[notifications] Skipped admin notifications: invalid internal url", {
      stage: "create_in_app",
    });
    return { recipientCount: 0, insertedCount: 0 };
  }

  try {
    const adminIds = (await getActiveAdminIds()).filter(
      (userId) => userId !== options?.excludeUserId,
    );

    if (adminIds.length === 0) {
      console.error("[notifications] Configuration error: zero active administrators found", {
        stage: "find_admins",
      });
      return { recipientCount: 0, insertedCount: 0 };
    }

    const rows = adminIds.map((userId) => buildInsertRow(userId, payload));
    const insertedCount = await insertNotificationBatch(rows);

    console.info("[notifications] Admin in-app notifications created", {
      stage: "create_in_app",
      recipientCount: adminIds.length,
      insertedCount,
      type: payload.type,
    });

    return { recipientCount: adminIds.length, insertedCount };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[notifications] Failed to create admin notifications", {
      stage: "create_in_app",
      message,
    });
    return { recipientCount: 0, insertedCount: 0 };
  }
}

export async function createNotificationsForAdminsWithPerUserEventKeys(
  base: Omit<UserNotificationPayload, "event_key">,
  buildEventKey: (adminId: string) => string,
  options?: { excludeUserId?: string },
): Promise<NotificationInsertSummary> {
  if (!isInternalUrl(base.url)) {
    console.error("[notifications] Skipped admin notifications: invalid internal url", {
      stage: "create_in_app",
    });
    return { recipientCount: 0, insertedCount: 0 };
  }

  try {
    const adminIds = (await getActiveAdminIds()).filter(
      (userId) => userId !== options?.excludeUserId,
    );

    if (adminIds.length === 0) {
      console.error("[notifications] Configuration error: zero active administrators found", {
        stage: "find_admins",
      });
      return { recipientCount: 0, insertedCount: 0 };
    }

    const rows = adminIds.map((userId) =>
      buildInsertRow(userId, {
        ...base,
        event_key: buildEventKey(userId),
      }),
    );
    const insertedCount = await insertNotificationBatch(rows);

    console.info("[notifications] Per-admin in-app notifications created", {
      stage: "create_in_app",
      recipientCount: adminIds.length,
      insertedCount,
      type: base.type,
    });

    return { recipientCount: adminIds.length, insertedCount };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[notifications] Failed to create per-admin notifications", {
      stage: "create_in_app",
      message,
    });
    return { recipientCount: 0, insertedCount: 0 };
  }
}

export async function createNotificationForUser(
  userId: string,
  payload: UserNotificationPayload,
): Promise<NotificationInsertSummary> {
  if (!userId || !isInternalUrl(payload.url)) {
    console.error("[notifications] Skipped user notification: invalid recipient or url", {
      stage: "create_in_app",
    });
    return { recipientCount: 0, insertedCount: 0 };
  }

  try {
    const admin = createAdminClient();

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, role")
      .eq("id", userId)
      .maybeSingle();

    if (profileError || !profile) {
      console.error("[notifications] Skipped user notification: recipient profile not found", {
        stage: "create_in_app",
        code: profileError?.code ?? null,
        message: profileError?.message ?? null,
      });
      return { recipientCount: 0, insertedCount: 0 };
    }

    const { data: authData, error: authError } = await admin.auth.admin.getUserById(userId);

    if (authError || !authData.user || isAuthUserBlocked(authData.user)) {
      console.error("[notifications] Skipped user notification: recipient inactive or blocked", {
        stage: "create_in_app",
        message: authError?.message ?? null,
      });
      return { recipientCount: 0, insertedCount: 0 };
    }

    const insertedCount = await insertNotificationBatch([buildInsertRow(userId, payload)]);

    console.info("[notifications] User in-app notification created", {
      stage: "create_in_app",
      recipientCount: 1,
      insertedCount,
      type: payload.type,
    });

    return { recipientCount: 1, insertedCount };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[notifications] Failed to create user notification", {
      stage: "create_in_app",
      message,
    });
    return { recipientCount: 0, insertedCount: 0 };
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
