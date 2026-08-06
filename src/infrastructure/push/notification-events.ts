import "server-only";

import { createAdminClient } from "@/infrastructure/supabase/admin";

/**
 * Records an idempotency key for notification delivery.
 * Returns true when this process should send notifications.
 * Duplicate keys (23505) return false.
 * Unexpected ledger failures fail open so delivery is not permanently blocked.
 */
export async function recordNotificationEvent(
  eventKey: string,
  eventType: string,
  entityId?: string,
): Promise<boolean> {
  try {
    const admin = createAdminClient();

    const { error } = await admin.from("notification_events").insert({
      event_key: eventKey,
      event_type: eventType,
      entity_id: entityId ?? null,
    } as never);

    if (!error) {
      return true;
    }

    if (error.code === "23505") {
      return false;
    }

    console.error("[notifications] Failed to record notification event (fail-open)", {
      stage: "record_event",
      eventType,
      code: error.code ?? null,
      message: error.message,
    });

    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[notifications] Notification event ledger unavailable (fail-open)", {
      stage: "record_event",
      eventType,
      message,
    });
    return true;
  }
}
