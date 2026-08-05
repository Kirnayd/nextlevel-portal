"use client";

import { useEffect, useRef } from "react";

import type { ChatMessage } from "@/features/questions/actions";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

type ChatThreadProps = {
  messages: ChatMessage[];
  isLoading: boolean;
  hasMore: boolean;
  onLoadOlder: () => void;
};

function formatMessageTime(value: string): string {
  return new Intl.DateTimeFormat("uk-UA", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ChatThread({ messages, isLoading, hasMore, onLoadOlder }: ChatThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const previousCountRef = useRef(0);

  useEffect(() => {
    if (messages.length > previousCountRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }

    previousCountRef.current = messages.length;
  }, [messages.length]);

  if (isLoading && messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Завантаження повідомлень…
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
      {hasMore ? (
        <div className="flex justify-center">
          <Button type="button" size="sm" variant="outline" onClick={onLoadOlder}>
            Показати попередні
          </Button>
        </div>
      ) : null}

      {messages.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">Повідомлень ще немає.</p>
      ) : null}

      {messages.map((message) => (
        <div
          key={message.id}
          className={cn("flex", message.is_own ? "justify-end" : "justify-start")}
        >
          <div
            className={cn(
              "max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm",
              message.is_own
                ? "rounded-br-md bg-primary text-primary-foreground"
                : "rounded-bl-md bg-muted",
            )}
          >
            <p className="text-[11px] font-medium opacity-80">
              {message.is_own ? "Ви" : message.is_admin_sender ? "Адміністратор" : "Співробітник"}
            </p>
            <p className="whitespace-pre-wrap break-words">{message.message}</p>
            <p className="mt-1 text-[10px] opacity-70">{formatMessageTime(message.created_at)}</p>
          </div>
        </div>
      ))}

      <div ref={bottomRef} />
    </div>
  );
}
