"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { QuestionWithAnswer } from "@/features/questions/actions";
import { AdminQuestionDelete } from "@/features/questions/components/admin-question-delete";
import { QuestionStatusBadge } from "@/features/questions/components/question-status-badge";
import { markQuestionAnswerRead } from "@/features/unread/actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { cn } from "@/shared/lib/utils";

const AdminQuestionActions = dynamic(
  () =>
    import("@/features/questions/components/admin-question-actions").then(
      (module) => module.AdminQuestionActions,
    ),
  { ssr: false, loading: () => null },
);

type QuestionListProps = {
  questions: QuestionWithAnswer[];
  isAdmin: boolean;
};

function formatCreatedAt(value: string): string {
  return new Intl.DateTimeFormat("uk-UA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getAuthorLabel(question: QuestionWithAnswer): string {
  if (question.author?.full_name?.trim()) {
    return question.author.full_name.trim();
  }

  if (question.author?.email?.trim()) {
    return question.author.email.trim();
  }

  return "Невідомий співробітник";
}

function QuestionToast({ message }: { message: string }) {
  if (!message) {
    return null;
  }

  return (
    <div
      role="status"
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-50 w-[min(calc(100%-2rem),24rem)] -translate-x-1/2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 shadow-lg dark:text-emerald-300"
    >
      {message}
    </div>
  );
}

function QuestionCard({
  question,
  isAdmin,
  onQuestionDeleted,
}: {
  question: QuestionWithAnswer;
  isAdmin: boolean;
  onQuestionDeleted: (questionId: string) => void;
}) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(isAdmin && question.status !== "answered");
  const [isAnswerVisible, setIsAnswerVisible] = useState(false);
  const [isMarkingAnswerRead, setIsMarkingAnswerRead] = useState(false);

  async function handleViewAnswer() {
    if (isAdmin || !question.answer || isAnswerVisible) {
      return;
    }

    setIsAnswerVisible(true);
    setIsMarkingAnswerRead(true);

    try {
      const result = await markQuestionAnswerRead(question.id);

      if (result.success) {
        router.refresh();
      }
    } catch (error) {
      console.error("Mark question answer read error:", error);
    } finally {
      setIsMarkingAnswerRead(false);
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-lg">{question.subject}</CardTitle>
            <CardDescription>{formatCreatedAt(question.created_at)}</CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <QuestionStatusBadge status={question.status} />
            {isAdmin ? (
              <AdminQuestionDelete questionId={question.id} onDeleted={onQuestionDeleted} />
            ) : null}
          </div>
        </div>

        {isAdmin ? (
          <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
            <p className="font-medium">{getAuthorLabel(question)}</p>
            {question.author?.email ? (
              <p className="text-muted-foreground">{question.author.email}</p>
            ) : null}
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{question.message}</p>

        {question.answer ? (
          isAdmin || isAnswerVisible ? (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                Відповідь адміністратора
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                {question.answer.message}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {formatCreatedAt(question.answer.created_at)}
              </p>
            </div>
          ) : (
            <button
              type="button"
              disabled={isMarkingAnswerRead}
              onClick={() => void handleViewAnswer()}
              className={cn(
                "text-sm font-medium text-primary underline-offset-4 hover:underline",
              )}
            >
              {isMarkingAnswerRead ? "Відкриття…" : "Переглянути відповідь"}
            </button>
          )
        ) : null}

        {isAdmin ? (
          <div>
            <button
              type="button"
              onClick={() => setIsExpanded((current) => !current)}
              className={cn(
                "text-sm font-medium text-primary underline-offset-4 hover:underline",
              )}
            >
              {isExpanded ? "Згорнути" : "Відповісти"}
            </button>

            {isExpanded ? <AdminQuestionActions question={question} /> : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function QuestionList({ questions, isAdmin }: QuestionListProps) {
  const [items, setItems] = useState(questions);
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    setItems(questions);
  }, [questions]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setToastMessage("");
    }, 3000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [toastMessage]);

  function handleQuestionDeleted(questionId: string) {
    setItems((current) => current.filter((question) => question.id !== questionId));
    setToastMessage("Запитання видалено.");
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{isAdmin ? "Запитань немає" : "У вас ще немає запитань"}</CardTitle>
          <CardDescription>
            {isAdmin
              ? "Нові запитання від співробітників з’являться тут."
              : "Натисніть «Поставити запитання», щоб звернутися до адміністратора."}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {items.map((question) => (
          <QuestionCard
            key={question.id}
            question={question}
            isAdmin={isAdmin}
            onQuestionDeleted={handleQuestionDeleted}
          />
        ))}
      </div>

      <QuestionToast message={toastMessage} />
    </>
  );
}
