"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type {
  ChatMessage,
  ConversationSummary,
} from "@/features/questions/actions";
import {
  getConversationMessages,
  getConversationSummaries,
  getUnreadQuestionMessagesCount,
  sendQuestionMessage,
  updateQuestionStatus,
  deleteQuestion,
} from "@/features/questions/actions";
import { ChatComposer } from "@/features/questions/components/chat-composer";
import { ConversationList } from "@/features/questions/components/conversation-list";
import { ChatThread } from "@/features/questions/components/chat-thread";
import { DeleteQuestionDialog } from "@/features/questions/components/delete-question-dialog";
import { EmployeeQuestionPanel } from "@/features/questions/components/employee-question-panel";
import { QuestionStatusFilter } from "@/features/questions/components/question-status-filter";
import type { QuestionFilter } from "@/features/questions/constants";
import { markQuestionChatRead } from "@/features/unread/actions";
import { createClient } from "@/infrastructure/supabase/client";
import { Button } from "@/shared/components/ui/button";
import type { Enums } from "@/shared/types/database.types";

type QuestionsChatViewProps = {
  initialConversations: ConversationSummary[];
  isAdmin: boolean;
  currentUserId: string;
  activeFilter: QuestionFilter;
  initialQuestionId?: string | null;
};

export function QuestionsChatView({
  initialConversations,
  isAdmin,
  currentUserId,
  activeFilter,
  initialQuestionId = null,
}: QuestionsChatViewProps) {
  const router = useRouter();
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialQuestionId && initialConversations.some((item) => item.id === initialQuestionId)
      ? initialQuestionId
      : null,
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [statusError, setStatusError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const selectedIdRef = useRef<string | null>(selectedId);
  const markedReadRef = useRef<string | null>(null);

  selectedIdRef.current = selectedId;

  useEffect(() => {
    setConversations(initialConversations);
  }, [initialConversations]);

  const selectedConversation = useMemo(
    () => conversations.find((item) => item.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  const refreshConversations = useCallback(async () => {
    const next = await getConversationSummaries(isAdmin ? activeFilter : undefined, {
      userIsAdmin: isAdmin,
    });
    setConversations(next);
  }, [activeFilter, isAdmin]);

  const loadMessages = useCallback(async (questionId: string) => {
    setIsLoadingMessages(true);
    setSendError("");
    setStatusError("");

    try {
      const result = await getConversationMessages(questionId);
      setMessages(result.messages);
      setHasMoreMessages(result.hasMore);
    } catch (error) {
      console.error("Failed to load chat messages:", error);
      setMessages([]);
      setHasMoreMessages(false);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  const markSelectedRead = useCallback(
    async (questionId: string) => {
      if (markedReadRef.current === questionId) {
        return;
      }

      markedReadRef.current = questionId;

      const result = await markQuestionChatRead(questionId);

      if (!result.success) {
        markedReadRef.current = null;
        return;
      }

      setConversations((current) =>
        current.map((item) =>
          item.id === questionId ? { ...item, unread_count: 0 } : item,
        ),
      );

      void getUnreadQuestionMessagesCount();
    },
    [],
  );

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      setHasMoreMessages(false);
      return;
    }

    markedReadRef.current = null;
    void loadMessages(selectedId);
    void markSelectedRead(selectedId);
  }, [selectedId, loadMessages, markSelectedRead]);

  useEffect(() => {
    if (!selectedId) {
      return;
    }

    const supabase = createClient();
    const channel = supabase
      .channel(`question-chat-${selectedId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "question_messages",
          filter: `question_id=eq.${selectedId}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            question_id: string;
            sender_id: string;
            message: string;
            created_at: string;
          };

          setMessages((current) => {
            if (current.some((item) => item.id === row.id)) {
              return current;
            }

            const isOwn = row.sender_id === currentUserId;

            return [
              ...current,
              {
                ...row,
                is_own: isOwn,
                is_admin_sender: isOwn ? isAdmin : !isAdmin,
              },
            ];
          });

          setConversations((current) => {
            const updated = current.map((item) => {
              if (item.id !== row.question_id) {
                return item;
              }

              const isIncoming = row.sender_id !== currentUserId;

              return {
                ...item,
                last_message_at: row.created_at,
                last_message_by: row.sender_id,
                last_message_preview: row.message,
                unread_count:
                  selectedIdRef.current === row.question_id
                    ? 0
                    : isIncoming
                      ? item.unread_count + 1
                      : item.unread_count,
              };
            });

            return [...updated].sort((left, right) => {
              if (left.unread_count > 0 && right.unread_count === 0) {
                return -1;
              }

              if (left.unread_count === 0 && right.unread_count > 0) {
                return 1;
              }

              return (
                new Date(right.last_message_at).getTime() -
                new Date(left.last_message_at).getTime()
              );
            });
          });

          if (row.sender_id !== currentUserId && selectedIdRef.current === row.question_id) {
            markedReadRef.current = null;
            void markSelectedRead(row.question_id);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [selectedId, currentUserId, isAdmin, markSelectedRead]);

  async function handleSelect(questionId: string) {
    setSelectedId(questionId);
    router.replace(`/questions?id=${questionId}${isAdmin && activeFilter !== "all" ? `&status=${activeFilter}` : ""}`, {
      scroll: false,
    });
  }

  async function handleSend(text: string) {
    if (!selectedId || isSending) {
      return;
    }

    setIsSending(true);
    setSendError("");

    const optimisticId = `optimistic-${Date.now()}`;
    const optimistic: ChatMessage = {
      id: optimisticId,
      question_id: selectedId,
      sender_id: currentUserId,
      message: text,
      created_at: new Date().toISOString(),
      is_own: true,
      is_admin_sender: isAdmin,
    };

    setMessages((current) => [...current, optimistic]);

    try {
      const result = await sendQuestionMessage(selectedId, text);

      if (!result.success) {
        setMessages((current) => current.filter((item) => item.id !== optimisticId));
        setSendError(result.error);
        throw new Error(result.error);
      }

      if (result.message) {
        setMessages((current) => {
          const withoutOptimistic = current.filter((item) => item.id !== optimisticId);

          if (withoutOptimistic.some((item) => item.id === result.message?.id)) {
            return withoutOptimistic;
          }

          return [...withoutOptimistic, result.message as ChatMessage];
        });
      }

      await refreshConversations();
    } catch (error) {
      setMessages((current) => current.filter((item) => item.id !== optimisticId));
      setSendError(
        error instanceof Error ? error.message : "Не вдалося надіслати повідомлення.",
      );
      throw error;
    } finally {
      setIsSending(false);
    }
  }

  async function handleStatusChange(status: Enums<"question_status">) {
    if (!selectedId) {
      return;
    }

    setStatusError("");
    const result = await updateQuestionStatus(selectedId, status);

    if (!result.success) {
      setStatusError(result.error);
      return;
    }

    setConversations((current) =>
      current.map((item) => (item.id === selectedId ? { ...item, status } : item)),
    );
  }

  async function handleDelete() {
    if (!selectedId) {
      return;
    }

    setIsDeleting(true);
    setDeleteError("");

    const result = await deleteQuestion(selectedId);

    if (!result.success) {
      setDeleteError(result.error);
      setIsDeleting(false);
      return;
    }

    setDeleteOpen(false);
    setIsDeleting(false);
    setSelectedId(null);
    setMessages([]);
    setConversations((current) => current.filter((item) => item.id !== selectedId));
    router.replace(
      `/questions${isAdmin && activeFilter !== "all" ? `?status=${activeFilter}` : ""}`,
      { scroll: false },
    );
  }

  async function handleConversationCreated(questionId: string) {
    await refreshConversations();
    setSelectedId(questionId);
    router.replace(`/questions?id=${questionId}`, { scroll: false });
  }

  async function handleLoadOlder() {
    if (!selectedId || !hasMoreMessages || messages.length === 0) {
      return;
    }

    const oldest = messages[0];
    const result = await getConversationMessages(selectedId, { before: oldest.created_at });

    setMessages((current) => {
      const existingIds = new Set(current.map((item) => item.id));
      const older = result.messages.filter((item) => !existingIds.has(item.id));
      return [...older, ...current];
    });
    setHasMoreMessages(result.hasMore);
  }

  return (
    <div className="space-y-4">
      {isAdmin ? <QuestionStatusFilter activeFilter={activeFilter} /> : null}
      {!isAdmin ? (
        <EmployeeQuestionPanel onCreated={handleConversationCreated} />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <ConversationList
          conversations={conversations}
          selectedId={selectedId}
          isAdmin={isAdmin}
          onSelect={(id) => void handleSelect(id)}
        />

        <section className="flex min-h-[70dvh] flex-col overflow-hidden rounded-lg border bg-card lg:min-h-[calc(100dvh-12rem)]">
          {!selectedConversation ? (
            <div className="flex flex-1 items-center justify-center px-4 text-center text-sm text-muted-foreground">
              Оберіть звернення, щоб відкрити чат.
            </div>
          ) : (
            <>
              <header className="shrink-0 space-y-3 border-b px-4 py-3">
                <div className="space-y-1">
                  <h2 className="text-base font-semibold leading-tight">
                    {selectedConversation.subject}
                  </h2>
                  {isAdmin && selectedConversation.author ? (
                    <p className="text-xs text-muted-foreground">
                      {selectedConversation.author.full_name ||
                        selectedConversation.author.email ||
                        "Співробітник"}
                    </p>
                  ) : null}
                </div>

                {isAdmin ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedConversation.status !== "progress" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void handleStatusChange("progress")}
                      >
                        Прийняти в роботу
                      </Button>
                    ) : null}
                    {selectedConversation.status !== "answered" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void handleStatusChange("answered")}
                      >
                        Закрити звернення
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void handleStatusChange("progress")}
                      >
                        Відкрити повторно
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setDeleteError("");
                        setDeleteOpen(true);
                      }}
                    >
                      Видалити
                    </Button>
                  </div>
                ) : null}

                {statusError ? (
                  <p role="alert" className="text-xs text-destructive">
                    {statusError}
                  </p>
                ) : null}
              </header>

              <ChatThread
                messages={messages}
                isLoading={isLoadingMessages}
                hasMore={hasMoreMessages}
                onLoadOlder={() => void handleLoadOlder()}
              />

              <ChatComposer
                disabled={isSending}
                errorMessage={sendError}
                onSend={handleSend}
              />
            </>
          )}
        </section>
      </div>

      <DeleteQuestionDialog
        open={deleteOpen}
        isDeleting={isDeleting}
        errorMessage={deleteError}
        onCancel={() => {
          if (!isDeleting) {
            setDeleteOpen(false);
          }
        }}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
