"use client";

import { useEffect, useState } from "react";

import { IOS_INSTALL_DISMISSAL_KEY } from "@/shared/lib/pwa-theme";
import { Button } from "@/shared/components/ui/button";

function isIosDevice(): boolean {
  const userAgent = window.navigator.userAgent;
  const isClassicIos = /iPad|iPhone|iPod/.test(userAgent);
  const isIpadOs =
    window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1;

  return isClassicIos || isIpadOs;
}

function isSafariBrowser(): boolean {
  const userAgent = window.navigator.userAgent;

  if (/CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent)) {
    return false;
  }

  return /Safari/.test(userAgent) && !/Chrome|Chromium|CriOS/.test(userAgent);
}

function isStandaloneMode(): boolean {
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  );
}

export function IosInstallPrompt() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isIosDevice() || !isSafariBrowser() || isStandaloneMode()) {
      return;
    }

    if (window.localStorage.getItem(IOS_INSTALL_DISMISSAL_KEY) === "true") {
      return;
    }

    setIsVisible(true);
  }, []);

  function handleDismiss() {
    setIsVisible(false);
  }

  function handleDismissPermanently() {
    window.localStorage.setItem(IOS_INSTALL_DISMISSAL_KEY, "true");
    setIsVisible(false);
  }

  if (!isVisible) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Інструкція встановлення на iOS"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/90"
    >
      <div className="mx-auto flex w-full max-w-lg flex-col gap-3">
        <div>
          <p className="text-sm font-medium">Встановіть Nextlevel на головний екран</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Натисніть кнопку «Поділитися», а потім — «На початковий екран».
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={handleDismiss}>
            Зрозуміло
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={handleDismissPermanently}>
            Не показувати
          </Button>
        </div>
      </div>
    </div>
  );
}
