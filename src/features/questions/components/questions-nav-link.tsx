"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { getNewQuestionsCount } from "@/features/questions/actions";
import { NewQuestionsBadge } from "@/features/questions/components/new-questions-badge";
import { createClient } from "@/infrastructure/supabase/client";

type QuestionsNavLinkProps = {
  initialCount: number;
};

export function QuestionsNavLink({ initialCount }: QuestionsNavLinkProps) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  const refreshCount = useCallback(async () => {
    try {
      const nextCount = await getNewQuestionsCount();
      setCount(nextCount);
    } catch (error) {
      console.error("Failed to refresh new questions count:", error);
    }
  }, []);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void refreshCount();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshCount]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("admin-new-questions-count")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "questions",
        },
        () => {
          void refreshCount();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refreshCount]);

  return (
    <Link
      href="/questions"
      prefetch
      className="relative inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
    >
      Запитання
      <NewQuestionsBadge count={count} />
    </Link>
  );
}
