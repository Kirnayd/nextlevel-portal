"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";

import { syncAppBadge } from "@/features/app-badge/app-badge";
import { fetchUnreadNotificationCount } from "@/features/notifications/actions";
import { getUnreadBadgeLabel } from "@/features/notifications/lib/format";
import { NavCountBadge } from "@/shared/components/nav-count-badge";
import { Button } from "@/shared/components/ui/button";
import { createClient } from "@/infrastructure/supabase/client";

const NotificationCenterPanel = dynamic(
  () =>
    import("@/features/notifications/components/notification-center-panel").then(
      (module) => module.NotificationCenterPanel,
    ),
  { ssr: false },
);

type NotificationCenterProps = {
  initialUnreadCount: number;
};

export function NotificationCenter({ initialUnreadCount }: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);

  useEffect(() => {
    setUnreadCount(initialUnreadCount);
  }, [initialUnreadCount]);

  useEffect(() => {
    void syncAppBadge(unreadCount);
  }, [unreadCount]);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const nextCount = await fetchUnreadNotificationCount();
      setUnreadCount(nextCount);
    } catch (error) {
      console.error("Failed to refresh unread notification count:", error);
    }
  }, []);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void refreshUnreadCount();
      }
    }

    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted || document.visibilityState === "visible") {
        void refreshUnreadCount();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [refreshUnreadCount]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("user-notifications-count")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_notifications",
        },
        () => {
          void refreshUnreadCount();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refreshUnreadCount]);

  const badgeLabel = getUnreadBadgeLabel(unreadCount);
  const ariaLabel =
    unreadCount > 0 ? `Непрочитаних сповіщень: ${badgeLabel}` : "Сповіщення";

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={ariaLabel}
        className="relative shrink-0 text-lg"
        onClick={() => setOpen(true)}
      >
        <span aria-hidden="true">🔔</span>
        <NavCountBadge count={unreadCount} ariaLabel={ariaLabel} />
      </Button>

      {open ? (
        <NotificationCenterPanel
          open={open}
          onClose={() => setOpen(false)}
          onUnreadCountChange={setUnreadCount}
        />
      ) : null}
    </>
  );
}
