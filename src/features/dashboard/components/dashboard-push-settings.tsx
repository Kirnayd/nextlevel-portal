"use client";

import dynamic from "next/dynamic";

const PushNotificationSettings = dynamic(
  () =>
    import("@/shared/components/pwa/push-notification-settings").then(
      (module) => module.PushNotificationSettings,
    ),
  { ssr: false, loading: () => null },
);

export function DashboardPushSettings() {
  return <PushNotificationSettings />;
}
