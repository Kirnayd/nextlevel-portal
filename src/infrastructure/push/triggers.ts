import "server-only";

import {
  createNotificationForUser,
  createNotificationsForAdminsWithPerUserEventKeys,
  createNotificationsForEmployees,
} from "@/infrastructure/notifications/create-user-notifications";
import { recordNotificationEvent } from "@/infrastructure/push/notification-events";
import {
  getPushWarningFromSummary,
  sendPushToAllAdmins,
  sendPushToAllEmployees,
  sendPushToUser,
} from "@/infrastructure/push/send-push-notification";

export async function notifyAnnouncementPublished(
  announcementId: string,
  title: string,
): Promise<string | undefined> {
  const eventKey = `announcement-published:${announcementId}`;
  const isFirstEvent = await recordNotificationEvent(
    eventKey,
    "announcement-published",
    announcementId,
  );

  if (!isFirstEvent) {
    return undefined;
  }

  const body = title.trim().slice(0, 200);

  const [, summary] = await Promise.all([
    createNotificationsForEmployees({
      type: "announcement",
      title: "Нове оголошення",
      body,
      url: "/announcements",
      entity_id: announcementId,
      event_key: `announcement:${announcementId}`,
    }),
    sendPushToAllEmployees(
      {
        title: "Нове оголошення",
        body,
        url: "/announcements",
        tag: `announcement-${announcementId}`,
      },
      { eventType: "announcement-published" },
    ),
  ]);

  return getPushWarningFromSummary(summary);
}

export async function notifyPriceUpdated(
  fileId: string,
  updatedAt: string,
): Promise<string | undefined> {
  const eventKey = `price-updated:${fileId}:${updatedAt}`;
  const isFirstEvent = await recordNotificationEvent(eventKey, "price-updated", fileId);

  if (!isFirstEvent) {
    return undefined;
  }

  const [, summary] = await Promise.all([
    createNotificationsForEmployees({
      type: "price",
      title: "Оновлено прайс",
      body: "Доступна нова версія прайсу.",
      url: "/price",
      entity_id: fileId,
      event_key: `price:${fileId}:${updatedAt}`,
    }),
    sendPushToAllEmployees(
      {
        title: "Оновлено прайс",
        body: "Доступна нова версія прайсу.",
        url: "/price",
        tag: `price-${fileId}`,
      },
      { eventType: "price-updated" },
    ),
  ]);

  return getPushWarningFromSummary(summary);
}

export async function notifyQuestionAnswered(
  answerId: string,
  questionId: string,
  questionUserId: string,
  subject: string,
): Promise<string | undefined> {
  return notifyEmployeeQuestionMessage(answerId, questionId, questionUserId, subject);
}

export async function notifyEmployeeQuestionMessage(
  messageId: string,
  questionId: string,
  questionUserId: string,
  subject: string,
): Promise<string | undefined> {
  const eventKey = `question-message:${messageId}:employee`;
  const isFirstEvent = await recordNotificationEvent(eventKey, "question-message", messageId);

  if (!isFirstEvent) {
    return undefined;
  }

  const body = subject.trim().slice(0, 200);

  console.info("[notifications] Notifying employee about admin chat message", {
    stage: "notify_employee",
    messageId,
    conversationId: questionId,
    senderRole: "admin",
  });

  const [, summary] = await Promise.all([
    createNotificationForUser(questionUserId, {
      type: "question_message",
      title: "Нове повідомлення адміністратора",
      body,
      url: "/questions",
      entity_id: questionId,
      event_key: `question-message:${messageId}:employee:${questionUserId}`,
    }),
    sendPushToUser(
      questionUserId,
      {
        title: "Нове повідомлення адміністратора",
        body,
        url: "/questions",
        tag: `question-message-${messageId}`,
      },
      { eventType: "question-message-employee" },
    ),
  ]);

  return getPushWarningFromSummary(summary);
}

export async function notifyAdminsQuestionMessage(
  messageId: string,
  questionId: string,
  subject: string,
  employeeLabel: string,
): Promise<string | undefined> {
  const eventKey = `question-message:${messageId}:admins`;
  const isFirstEvent = await recordNotificationEvent(eventKey, "question-message", messageId);

  if (!isFirstEvent) {
    console.info("[notifications] Skipping duplicate admin chat notification", {
      stage: "record_event",
      messageId,
      conversationId: questionId,
      senderRole: "employee",
    });
    return undefined;
  }

  const body = `${employeeLabel}: ${subject}`.trim().slice(0, 200);

  console.info("[notifications] Notifying administrators about employee chat message", {
    stage: "notify_admins",
    messageId,
    conversationId: questionId,
    senderRole: "employee",
  });

  // Await both paths. Fire-and-forget `void` was cancelled on Vercel after the
  // Server Action returned, so in-app Notification Center rows never persisted.
  const [inAppSummary, summary] = await Promise.all([
    createNotificationsForAdminsWithPerUserEventKeys(
      {
        type: "question_message",
        title: "Нове повідомлення від менеджера",
        body,
        url: "/questions",
        entity_id: questionId,
      },
      (adminId) => `question-message:${messageId}:admin:${adminId}`,
    ),
    sendPushToAllAdmins(
      {
        title: "Нове повідомлення від менеджера",
        body,
        url: "/questions",
        tag: `question-message-${messageId}`,
      },
      { eventType: "question-message-admin" },
    ),
  ]);

  console.info("[notifications] Admin chat notification delivery finished", {
    stage: "notify_admins",
    messageId,
    conversationId: questionId,
    senderRole: "employee",
    recipientCount: inAppSummary.recipientCount,
    insertedCount: inAppSummary.insertedCount,
    pushSent: summary.sent,
    pushFailed: summary.failed,
    pushRemovedExpired: summary.removedExpired,
  });

  return getPushWarningFromSummary(summary);
}

export async function notifyDocumentCreated(
  documentId: string,
  title: string,
  categoryName?: string | null,
  subcategoryName?: string | null,
): Promise<string | undefined> {
  const eventKey = `document-created:${documentId}`;
  const isFirstEvent = await recordNotificationEvent(eventKey, "document-created", documentId);

  if (!isFirstEvent) {
    return undefined;
  }

  const trimmedTitle = title.trim().slice(0, 120);
  const trimmedCategory = categoryName?.trim().slice(0, 80);
  const trimmedSubcategory = subcategoryName?.trim().slice(0, 80);

  let body = trimmedTitle;

  if (trimmedCategory && trimmedSubcategory) {
    body = `${trimmedTitle} · ${trimmedCategory} / ${trimmedSubcategory}`;
  } else if (trimmedCategory) {
    body = `${trimmedTitle} · ${trimmedCategory}`;
  } else if (trimmedSubcategory) {
    body = `${trimmedTitle} · ${trimmedSubcategory}`;
  }

  const [, summary] = await Promise.all([
    createNotificationsForEmployees({
      type: "document",
      title: "Новий документ",
      body: body.slice(0, 200),
      url: "/documents",
      entity_id: documentId,
      event_key: `document:${documentId}`,
    }),
    sendPushToAllEmployees(
      {
        title: "Новий документ",
        body: body.slice(0, 200),
        url: "/documents",
        tag: `document-${documentId}`,
      },
      { eventType: "document-created" },
    ),
  ]);

  return getPushWarningFromSummary(summary);
}
