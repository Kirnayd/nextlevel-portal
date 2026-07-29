"use client";

import { useCallback, useEffect, useState } from "react";

import {
  getPublicPushVapidKey,
  removePushSubscription,
  savePushSubscription,
} from "@/features/push/actions";
import { Button } from "@/shared/components/ui/button";
import {
  isIosSafariNotInstalled,
  isPushApiSupported,
  subscriptionToPayload,
  urlBase64ToUint8Array,
  waitForServiceWorkerRegistration,
} from "@/shared/lib/push-client";

type PushUiState =
  | "loading"
  | "unsupported"
  | "ios-install-required"
  | "ready"
  | "subscribed"
  | "denied";

export function PushNotificationSettings() {
  const [uiState, setUiState] = useState<PushUiState>("loading");
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [activeEndpoint, setActiveEndpoint] = useState<string | null>(null);

  const refreshSubscriptionState = useCallback(async () => {
    if (!isPushApiSupported()) {
      setUiState("unsupported");
      return;
    }

    if (isIosSafariNotInstalled()) {
      setUiState("ios-install-required");
      return;
    }

    if (Notification.permission === "denied") {
      setUiState("denied");
      return;
    }

    const registration = await waitForServiceWorkerRegistration();

    if (!registration) {
      setUiState("unsupported");
      return;
    }

    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      setActiveEndpoint(subscription.endpoint);
      setUiState("subscribed");
      return;
    }

    setActiveEndpoint(null);
    setUiState("ready");
  }, []);

  useEffect(() => {
    void refreshSubscriptionState();
  }, [refreshSubscriptionState]);

  async function handleEnableNotifications() {
    setErrorMessage("");
    setStatusMessage("");
    setIsBusy(true);

    try {
      const publicKey = await getPublicPushVapidKey();

      if (!publicKey) {
        setErrorMessage("Push-сповіщення ще не налаштовані на сервері.");
        return;
      }

      const permission = await Notification.requestPermission();

      if (permission === "denied") {
        setUiState("denied");
        setErrorMessage("Сповіщення заблоковано. Дозвольте їх у налаштуваннях Safari.");
        return;
      }

      if (permission !== "granted") {
        setErrorMessage("Не вдалося отримати дозвіл на сповіщення.");
        return;
      }

      const registration = await waitForServiceWorkerRegistration();

      if (!registration) {
        setErrorMessage("Service Worker недоступний.");
        return;
      }

      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        });
      }

      const payload = subscriptionToPayload(subscription);

      if (!payload) {
        setErrorMessage("Не вдалося прочитати push-підписку.");
        return;
      }

      const result = await savePushSubscription(payload);

      if (!result.success) {
        setErrorMessage(result.error);
        return;
      }

      setActiveEndpoint(payload.endpoint);
      setUiState("subscribed");
      setStatusMessage("Сповіщення увімкнено.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Невідома помилка під час увімкнення сповіщень.";

      setErrorMessage(message);
      console.error("Enable push notifications error:", error);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDisableNotifications() {
    setErrorMessage("");
    setStatusMessage("");
    setIsBusy(true);

    try {
      const registration = await waitForServiceWorkerRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      const endpoint = subscription?.endpoint ?? activeEndpoint;

      if (subscription) {
        await subscription.unsubscribe();
      }

      if (endpoint) {
        const result = await removePushSubscription(endpoint);

        if (!result.success) {
          setErrorMessage(result.error);
          return;
        }
      }

      setActiveEndpoint(null);
      setUiState("ready");
      setStatusMessage("Сповіщення вимкнено.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Невідома помилка під час вимкнення сповіщень.";

      setErrorMessage(message);
      console.error("Disable push notifications error:", error);
    } finally {
      setIsBusy(false);
    }
  }

  function renderBody() {
    if (uiState === "loading") {
      return (
        <p className="text-sm text-muted-foreground">Перевірка підтримки сповіщень…</p>
      );
    }

    if (uiState === "unsupported") {
      return (
        <p className="text-sm text-muted-foreground">
          Сповіщення не підтримуються на цьому пристрої.
        </p>
      );
    }

    if (uiState === "ios-install-required") {
      return (
        <p className="text-sm text-muted-foreground">
          Для отримання сповіщень додайте Nextlevel на Початковий екран.
        </p>
      );
    }

    if (uiState === "denied") {
      return (
        <p className="text-sm text-destructive">
          Сповіщення заблоковано. Дозвольте їх у налаштуваннях Safari.
        </p>
      );
    }

    return (
      <div className="space-y-3">
        {uiState === "subscribed" ? (
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            Сповіщення увімкнено ✅
          </p>
        ) : null}

        {statusMessage ? (
          <p className="text-sm text-emerald-700 dark:text-emerald-300" role="status">
            {statusMessage}
          </p>
        ) : null}

        {errorMessage ? (
          <p className="text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        ) : null}

        {uiState === "subscribed" ? (
          <Button type="button" variant="outline" disabled={isBusy} onClick={handleDisableNotifications}>
            {isBusy ? "Вимкнення…" : "Вимкнути"}
          </Button>
        ) : (
          <Button type="button" disabled={isBusy} onClick={handleEnableNotifications}>
            {isBusy ? "Увімкнення…" : "Увімкнути сповіщення"}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="mt-6 w-full space-y-3 rounded-lg border p-4">
      <h2 className="text-base font-semibold">Сповіщення</h2>
      {renderBody()}
    </div>
  );
}
