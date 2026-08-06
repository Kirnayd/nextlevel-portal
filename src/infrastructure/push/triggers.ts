import "server-only";

import {
  countUnreadQuestionMessagesForAdmin,
  createNotificationForUser,
  createNotificationsForAdminIds,
  createNotificationsForEmployees,
  resolveActiveAdminIds,
} from "@/infrastructure/notifications/create-user-notifications";
import { recordNotificationEvent } from "@/infrastructure/push/notification-events";
import {
  getPushWarningFromSummary,
  sendPushToAllEmployees,
  sendPushToUser,
  sendPushToUsers,
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
      messageId,
      senderRole: "employee",
      adminRecipientsFound: 0,
      inAppInsertAttempted: 0,
      inAppInserted: 0,
      inAppInsertFailed: 0,
      pushSubscriptionsFound: 0,
      pushSent: 0,
      pushFailed: 0,
      adminUnreadCountAfterSend: null,
      reason: "duplicate_event_key",
    });
    return undefined;
  }

  const body = `${employeeLabel}: ${subject}`.trim().slice(0, 200);

  let adminRecipientsFound = 0;
  let inAppInsertAttempted = 0;
  let inAppInserted = 0;
  let inAppInsertFailed = 0;
  let pushSubscriptionsFound = 0;
  let pushSent = 0;
  let pushFailed = 0;
  let adminUnreadCountAfterSend: number | null = null;

  try {
    const adminIds = await resolveActiveAdminIds();
    adminRecipientsFound = adminIds.length;

    if (adminIds.length === 0) {
      console.error("[notifications] Admin chat notification aborted: no active administrators", {
        messageId,
        senderRole: "employee",
        adminRecipientsFound: 0,
        inAppInsertAttempted: 0,
        inAppInserted: 0,
        inAppInsertFailed: 0,
        pushSubscriptionsFound: 0,
        pushSent: 0,
        pushFailed: 0,
        adminUnreadCountAfterSend: null,
      });
      return undefined;
    }

    const [inAppSummary, pushSummary] = await Promise.all([
      createNotificationsForAdminIds(
        adminIds,
        {
          type: "question_message",
          title: "Нове повідомлення від менеджера",
          body,
          url: "/questions",
          entity_id: questionId,
        },
        (adminId) => `question-message:${messageId}:admin:${adminId}`,
      ),
      sendPushToUsers(
        adminIds,
        {
          title: "Нове повідомлення від менеджера",
          body,
          url: "/questions",
          tag: `question-message-${messageId}`,
        },
        { eventType: "question-message-admin" },
      ),
    ]);

    inAppInsertAttempted = inAppSummary.attemptedCount;
    inAppInserted = inAppSummary.insertedCount;
    inAppInsertFailed = inAppSummary.failedCount;
    pushSubscriptionsFound = pushSummary.subscriptionsFound;
    pushSent = pushSummary.sent;
    pushFailed = pushSummary.failed;

    adminUnreadCountAfterSend = await countUnreadQuestionMessagesForAdmin(adminIds[0]);

    console.info("[notifications] Admin chat notification result", {
      messageId,
      senderRole: "employee",
      adminRecipientsFound,
      inAppInsertAttempted,
      inAppInserted,
      inAppInsertFailed,
      pushSubscriptionsFound,
      pushSent,
      pushFailed,
      adminUnreadCountAfterSend,
    });

    if (inAppInserted === 0 && inAppInsertFailed > 0) {
      console.error("[notifications] Admin in-app notification insert failed for all recipients", {
        messageId,
        senderRole: "employee",
        adminRecipientsFound,
        inAppInsertAttempted,
        inAppInserted,
        inAppInsertFailed,
      });
    }

    if (pushSubscriptionsFound === 0) {
      console.info("[notifications] Admin push subscriptions found: 0 (not counted as delivery)", {
        messageId,
        senderRole: "employee",
        adminRecipientsFound,
        pushSubscriptionsFound: 0,
        pushSent: 0,
        pushFailed: 0,
      });
    }

    return getPushWarningFromSummary(pushSummary);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[notifications] Admin chat notification threw", {
      messageId,
      senderRole: "employee",
      adminRecipientsFound,
      inAppInsertAttempted,
      inAppInserted,
      inAppInsertFailed,
      pushSubscriptionsFound,
      pushSent,
      pushFailed,
      adminUnreadCountAfterSend,
      errorMessage: message,
    });
    return undefined;
  }
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
