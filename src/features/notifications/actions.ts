"use server";

import { revalidatePath } from "next/cache";

import {
  getUnreadNotificationCount,
  getUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type UserNotificationRow,
  type UserNotificationType,
} from "@/infrastructure/notifications/create-user-notifications";
import {
  markAnnouncementRead,
  markPriceRead,
  markQuestionChatRead,
} from "@/features/unread/actions";
import { getAuthenticatedUser, isAdmin } from "@/shared/lib/auth";

export type NotificationListItem = {
  id: string;
  type: UserNotificationType;
  title: string;
  body: string | null;
  url: string;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
};

export type NotificationPageResult = {
  notifications: NotificationListItem[];
  hasMore: boolean;
};

function mapNotificationRow(row: UserNotificationRow): NotificationListItem {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    url: row.url,
    entity_id: row.entity_id,
    is_read: row.is_read,
    created_at: row.created_at,
  };
}

function revalidateNotificationPaths(): void {
  revalidatePath("/dashboard");
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  return getUnreadNotificationCount();
}

export async function fetchUserNotifications(
  offset: number,
): Promise<NotificationPageResult> {
  const pageSize = 20;
  const { notifications, hasMore } = await getUserNotifications(pageSize, offset);

  return {
    notifications: notifications.map(mapNotificationRow),
    hasMore,
  };
}

export async function markNotificationAsRead(
  notificationId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const result = await markNotificationRead(notificationId);

  if (result.success) {
    revalidateNotificationPaths();
  }

  return result;
}

export async function markAllNotificationsAsRead(): Promise<
  { success: true } | { success: false; error: string }
> {
  const result = await markAllNotificationsRead();

  if (result.success) {
    revalidateNotificationPaths();
  }

  return result;
}

export async function openNotification(
  notification: NotificationListItem,
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  if (!notification.url.startsWith("/") || notification.url.startsWith("//")) {
    return { success: false, error: "Недійсне посилання." };
  }

  const markResult = await markNotificationRead(notification.id);

  if (!markResult.success) {
    return markResult;
  }

  const user = await getAuthenticatedUser();
  const userIsAdmin = user ? await isAdmin(user.id) : true;

  if (notification.entity_id) {
    switch (notification.type) {
      case "announcement":
        if (!userIsAdmin) {
          await markAnnouncementRead(notification.entity_id);
        }
        break;
      case "price":
        if (!userIsAdmin) {
          await markPriceRead(notification.entity_id);
        }
        break;
      case "question_answer":
      case "question_message":
        await markQuestionChatRead(notification.entity_id);
        break;
      default:
        break;
    }
  }

  revalidateNotificationPaths();

  return { success: true, url: notification.url };
}
