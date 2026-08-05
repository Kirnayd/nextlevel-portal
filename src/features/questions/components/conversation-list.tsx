"use client";

import type { ConversationSummary } from "@/features/questions/actions";
import { QuestionStatusBadge } from "@/features/questions/components/question-status-badge";
import { cn } from "@/shared/lib/utils";

type ConversationListProps = {
  conversations: ConversationSummary[];
  selectedId: string | null;
  isAdmin: boolean;
  onSelect: (questionId: string) => void;
};

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("uk-UA", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function previewText(value: string | null): string {
  if (!value) {
    return "Немає повідомлень";
  }

  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed.length > 90 ? `${trimmed.slice(0, 90)}…` : trimmed;
}

export function ConversationList({
  conversations,
  selectedId,
  isAdmin,
  onSelect,
}: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="rounded-lg border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
        {isAdmin ? "Звернень ще немає." : "У вас ще немає звернень."}
      </div>
    );
  }

  return (
    <div className="max-h-[40dvh] space-y-2 overflow-y-auto lg:max-h-[calc(100dvh-12rem)]">
      {conversations.map((conversation) => {
        const authorLabel =
          conversation.author?.full_name?.trim() ||
          conversation.author?.email?.trim() ||
          "Співробітник";

        return (
          <button
            key={conversation.id}
            type="button"
            onClick={() => onSelect(conversation.id)}
            className={cn(
              "relative w-full rounded-lg border px-3 py-3 text-left transition-colors",
              selectedId === conversation.id
                ? "border-primary bg-primary/5"
                : "bg-card hover:bg-muted/40",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-1">
                {isAdmin ? (
                  <p className="truncate text-xs text-muted-foreground">{authorLabel}</p>
                ) : null}
                <p className="truncate text-sm font-medium">{conversation.subject}</p>
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {previewText(conversation.last_message_preview)}
                </p>
              </div>
              <QuestionStatusBadge status={conversation.status} />
            </div>

            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-[11px] text-muted-foreground">
                {formatDateTime(conversation.last_message_at)}
              </p>
              {conversation.unread_count > 0 ? (
                <span className="relative inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-semibold text-white">
                  {conversation.unread_count > 99 ? "99+" : conversation.unread_count}
                </span>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}
