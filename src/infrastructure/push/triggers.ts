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

  void createNotificationsForEmployees({
    type: "announcement",
    title: "Нове оголошення",
    body: title.trim().slice(0, 200),
    url: "/announcements",
    entity_id: announcementId,
    event_key: `announcement:${announcementId}`,
  });

  const summary = await sendPushToAllEmployees(
    {
      title: "Нове оголошення",
      body: title.trim().slice(0, 200),
      url: "/announcements",
      tag: `announcement-${announcementId}`,
    },
    { eventType: "announcement-published" },
  );

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

  void createNotificationsForEmployees({
    type: "price",
    title: "Оновлено прайс",
    body: "Доступна нова версія прайсу.",
    url: "/price",
    entity_id: fileId,
    event_key: `price:${fileId}:${updatedAt}`,
  });

  const summary = await sendPushToAllEmployees(
    {
      title: "Оновлено прайс",
      body: "Доступна нова версія прайсу.",
      url: "/price",
      tag: `price-${fileId}`,
    },
    { eventType: "price-updated" },
  );

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

  void createNotificationForUser(questionUserId, {
    type: "question_message",
    title: "Нове повідомлення адміністратора",
    body,
    url: "/questions",
    entity_id: questionId,
    event_key: `question-message:${messageId}:employee:${questionUserId}`,
  });

  const summary = await sendPushToUser(
    questionUserId,
    {
      title: "Нове повідомлення адміністратора",
      body,
      url: "/questions",
      tag: `question-message-${messageId}`,
    },
    { eventType: "question-message-employee" },
  );

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
    return undefined;
  }

  const body = `${employeeLabel}: ${subject}`.trim().slice(0, 200);

  void createNotificationsForAdminsWithPerUserEventKeys(
    {
      type: "question_message",
      title: "Нове повідомлення від менеджера",
      body,
      url: "/questions",
      entity_id: questionId,
    },
    (adminId) => `question-message:${messageId}:admin:${adminId}`,
  );

  const summary = await sendPushToAllAdmins(
    {
      title: "Нове повідомлення від менеджера",
      body,
      url: "/questions",
      tag: `question-message-${messageId}`,
    },
    { eventType: "question-message-admin" },
  );

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

  void createNotificationsForEmployees({
    type: "document",
    title: "Новий документ",
    body: body.slice(0, 200),
    url: "/documents",
    entity_id: documentId,
    event_key: `document:${documentId}`,
  });

  const summary = await sendPushToAllEmployees(
    {
      title: "Новий документ",
      body: body.slice(0, 200),
      url: "/documents",
      tag: `document-${documentId}`,
    },
    { eventType: "document-created" },
  );

  return getPushWarningFromSummary(summary);
}
