"use client";

import { useState } from "react";

import type { QuestionWithAnswer } from "@/features/questions/actions";
import { AdminQuestionActions } from "@/features/questions/components/admin-question-actions";
import { QuestionStatusBadge } from "@/features/questions/components/question-status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { cn } from "@/shared/lib/utils";

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

function QuestionCard({
  question,
  isAdmin,
}: {
  question: QuestionWithAnswer;
  isAdmin: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(isAdmin && question.status !== "answered");

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-lg">{question.subject}</CardTitle>
            <CardDescription>{formatCreatedAt(question.created_at)}</CardDescription>
          </div>
          <QuestionStatusBadge status={question.status} />
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
  if (questions.length === 0) {
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
    <div className="space-y-4">
      {questions.map((question) => (
        <QuestionCard key={question.id} question={question} isAdmin={isAdmin} />
      ))}
    </div>
  );
}
