import "server-only";

import { recordNotificationEvent } from "@/infrastructure/push/notification-events";
import {
  getPushWarningFromSummary,
  sendPushToAllEmployees,
  sendPushToUser,
} from "@/infrastructure/push/send-push-notification";

export async function notifyAnnouncementPublished(
  announcementId: string,
  title: string,
): Promise<string | undefined> {
  const eventKey = `announcement-published:${announcementId}`;
  const isFirstEvent = await recordNotificationEvent(eventKey, "announcement-published", announcementId);

  if (!isFirstEvent) {
    return undefined;
  }

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

export async function notifyPriceUpdated(fileId: string, updatedAt: string): Promise<string | undefined> {
  const eventKey = `price-updated:${fileId}:${updatedAt}`;
  const isFirstEvent = await recordNotificationEvent(eventKey, "price-updated", fileId);

  if (!isFirstEvent) {
    return undefined;
  }

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
  questionUserId: string,
  subject: string,
): Promise<string | undefined> {
  const eventKey = `question-answered:${answerId}`;
  const isFirstEvent = await recordNotificationEvent(eventKey, "question-answered", answerId);

  if (!isFirstEvent) {
    return undefined;
  }

  const summary = await sendPushToUser(
    questionUserId,
    {
      title: "Відповідь на запитання",
      body: subject.trim().slice(0, 200),
      url: "/questions",
      tag: `question-${answerId}`,
    },
    { eventType: "question-answered" },
  );

  return getPushWarningFromSummary(summary);
}

export async function notifyDocumentCreated(
  documentId: string,
  title: string,
  categoryName?: string | null,
): Promise<string | undefined> {
  const eventKey = `document-created:${documentId}`;
  const isFirstEvent = await recordNotificationEvent(eventKey, "document-created", documentId);

  if (!isFirstEvent) {
    return undefined;
  }

  const body = categoryName?.trim()
    ? `${title.trim().slice(0, 120)} · ${categoryName.trim().slice(0, 80)}`
    : title.trim().slice(0, 200);

  const summary = await sendPushToAllEmployees(
    {
      title: "Новий документ",
      body,
      url: "/documents",
      tag: `document-${documentId}`,
    },
    { eventType: "document-created" },
  );

  return getPushWarningFromSummary(summary);
}
