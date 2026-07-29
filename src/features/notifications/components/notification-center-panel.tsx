"use client";

import { useCallback, useEffect, useState, useTransition, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";

import {
  fetchUserNotifications,
  markAllNotificationsAsRead,
  openNotification,
  type NotificationListItem,
} from "@/features/notifications/actions";
import {
  formatNotificationDateTime,
  getNotificationIcon,
} from "@/features/notifications/lib/format";
import { Button } from "@/shared/components/ui/button";

type NotificationCenterPanelProps = {
  open: boolean;
  onClose: () => void;
  onUnreadCountChange: Dispatch<SetStateAction<number>>;
};

export function NotificationCenterPanel({
  open,
  onClose,
  onUnreadCountChange,
}: NotificationCenterPanelProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationListItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const loadNotifications = useCallback(
    async (offset: number, append: boolean) => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const result = await fetchUserNotifications(offset);

        setNotifications((current) =>
          append ? [...current, ...result.notifications] : result.notifications,
        );
        setHasMore(result.hasMore);
      } catch (error) {
        console.error("Failed to load notifications:", error);
        setErrorMessage("Не вдалося завантажити сповіщення.");
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    void loadNotifications(0, false);
  }, [loadNotifications, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPending, onClose, open]);

  function handleMarkAllRead() {
    startTransition(async () => {
      setErrorMessage("");

      const result = await markAllNotificationsAsRead();

      if (!result.success) {
        setErrorMessage(result.error);
        return;
      }

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          is_read: true,
        })),
      );
      onUnreadCountChange(0);
      router.refresh();
    });
  }

  function handleOpenNotification(notification: NotificationListItem) {
    startTransition(async () => {
      setErrorMessage("");

      const result = await openNotification(notification);

      if (!result.success) {
        setErrorMessage(result.error);
        return;
      }

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, is_read: true } : item,
        ),
      );
      if (!notification.is_read) {
        onUnreadCountChange((currentCount) => Math.max(0, currentCount - 1));
      }
      onClose();
      router.push(result.url);
      router.refresh();
    });
  }

  function handleLoadMore() {
    void loadNotifications(notifications.length, true);
  }

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={() => {
        if (!isPending) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-center-title"
        className="flex max-h-[min(85dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)))] w-full max-w-lg flex-col overflow-hidden rounded-t-xl border bg-background shadow-lg sm:rounded-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
          <h2 id="notification-center-title" className="text-lg font-semibold">
            Сповіщення
          </h2>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending || notifications.every((item) => item.is_read)}
              onClick={handleMarkAllRead}
            >
              Позначити все як прочитане
            </Button>
            <Button type="button" variant="ghost" size="sm" disabled={isPending} onClick={onClose}>
              Закрити
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {errorMessage ? (
            <div
              role="alert"
              className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {errorMessage}
            </div>
          ) : null}

          {isLoading && notifications.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Завантаження…</p>
          ) : notifications.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Сповіщень поки немає.</p>
          ) : (
            <ul className="space-y-2">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleOpenNotification(notification)}
                    className={`w-full rounded-lg border px-3 py-3 text-left transition-colors hover:bg-accent/50 disabled:opacity-60 ${
                      notification.is_read ? "bg-background" : "border-primary/30 bg-primary/5"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span aria-hidden="true" className="text-xl leading-none">
                        {getNotificationIcon(notification.type)}
                      </span>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium">{notification.title}</p>
                          {!notification.is_read ? (
                            <span
                              aria-hidden="true"
                              className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-600"
                            />
                          ) : null}
                        </div>
                        {notification.body ? (
                          <p className="text-sm text-muted-foreground">{notification.body}</p>
                        ) : null}
                        <p className="text-xs text-muted-foreground">
                          {formatNotificationDateTime(notification.created_at)}
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {hasMore ? (
            <div className="mt-4 flex justify-center">
              <Button
                type="button"
                variant="outline"
                disabled={isLoading || isPending}
                onClick={handleLoadMore}
              >
                {isLoading ? "Завантаження…" : "Показати ще"}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
