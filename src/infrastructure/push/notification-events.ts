import "server-only";

import { createAdminClient } from "@/infrastructure/supabase/admin";

export async function recordNotificationEvent(
  eventKey: string,
  eventType: string,
  entityId?: string,
): Promise<boolean> {
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

  console.error("Failed to record notification event:", error.message);
  return false;
}
