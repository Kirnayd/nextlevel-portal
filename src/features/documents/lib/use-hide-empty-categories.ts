"use client";

import { useEffect, useState } from "react";

import { HIDE_EMPTY_CATEGORIES_STORAGE_KEY } from "@/features/documents/constants";

export function useHideEmptyCategoriesPreference(defaultValue = true) {
  const [hideEmpty, setHideEmpty] = useState(defaultValue);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const storedValue = window.localStorage.getItem(HIDE_EMPTY_CATEGORIES_STORAGE_KEY);

      if (storedValue === "true") {
        setHideEmpty(true);
      } else if (storedValue === "false") {
        setHideEmpty(false);
      }
    } catch (error) {
      console.error("Failed to read hide-empty preference:", error);
    } finally {
      setIsReady(true);
    }
  }, []);

  function updateHideEmpty(nextValue: boolean) {
    setHideEmpty(nextValue);

    try {
      window.localStorage.setItem(HIDE_EMPTY_CATEGORIES_STORAGE_KEY, String(nextValue));
    } catch (error) {
      console.error("Failed to save hide-empty preference:", error);
    }
  }

  return { hideEmpty, setHideEmpty: updateHideEmpty, isReady };
}
