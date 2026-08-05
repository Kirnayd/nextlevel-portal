"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { getUnreadQuestionMessagesCount } from "@/features/questions/actions";
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
      const nextCount = await getUnreadQuestionMessagesCount();
      setCount(nextCount);
    } catch (error) {
      console.error("Failed to refresh unread questions count:", error);
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
      .channel("admin-unread-question-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "question_messages",
        },
        () => {
          void refreshCount();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "question_chat_reads",
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
