"use client";

import { useEffect } from "react";

import { clearAppBadge } from "@/features/app-badge/app-badge";

/**
 * Clears the PWA app icon badge when the login screen is shown,
 * so a previous user's count never remains after logout.
 */
export function ClearAppBadgeOnMount() {
  useEffect(() => {
    void clearAppBadge();
  }, []);

  return null;
}
