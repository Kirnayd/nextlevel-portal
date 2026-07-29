"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { submitAnswer, takeQuestionInProgress } from "@/features/questions/actions";
import type { QuestionWithAnswer } from "@/features/questions/actions";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { cn } from "@/shared/lib/utils";

const textareaClassName = cn(
  "flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
);

type AdminQuestionActionsProps = {
  question: QuestionWithAnswer;
};

export function AdminQuestionActions({ question }: AdminQuestionActionsProps) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  async function handleTakeInProgress() {
    setErrorMessage("");
    setSuccessMessage("");
    setIsUpdatingStatus(true);

    try {
      const result = await takeQuestionInProgress(question.id);

      if (!result.success) {
        setErrorMessage(result.error);
        return;
      }

      setSuccessMessage("Статус змінено на «В роботі».");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Невідома помилка під час оновлення статусу.";

      setErrorMessage(message);
      console.error("Take question in progress error:", error);
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  async function handleSubmitAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmittingAnswer(true);

    try {
      const formData = new FormData(event.currentTarget);
      const result = await submitAnswer(question.id, formData);

      if (!result.success) {
        setErrorMessage(result.error);
        return;
      }

      event.currentTarget.reset();
      setSuccessMessage("Відповідь збережено.");

      if (result.pushWarning) {
        setSuccessMessage((current) => `${current} ${result.pushWarning}`);
      }

      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Невідома помилка під час збереження відповіді.";

      setErrorMessage(message);
      console.error("Submit answer error:", error);
    } finally {
      setIsSubmittingAnswer(false);
    }
  }

  const canTakeInProgress = question.status !== "answered" && question.status !== "progress";
  const canAnswer = question.status !== "answered" && !question.answer;

  if (!canTakeInProgress && !canAnswer) {
    return null;
  }

  return (
    <div className="space-y-4 border-t pt-4">
      {canTakeInProgress ? (
        <Button
          type="button"
          variant="outline"
          disabled={isUpdatingStatus || isSubmittingAnswer}
          onClick={handleTakeInProgress}
        >
          {isUpdatingStatus ? "Оновлення…" : "Взяти в роботу"}
        </Button>
      ) : null}

      {canAnswer ? (
        <form className="space-y-3" onSubmit={handleSubmitAnswer}>
          <div className="space-y-2">
            <Label htmlFor={`answer-${question.id}`}>Відповідь адміністратора</Label>
            <textarea
              id={`answer-${question.id}`}
              name="message"
              required
              disabled={isSubmittingAnswer || isUpdatingStatus}
              placeholder="Напишіть відповідь співробітнику"
              className={textareaClassName}
            />
          </div>

          <Button type="submit" disabled={isSubmittingAnswer || isUpdatingStatus}>
            {isSubmittingAnswer ? "Збереження…" : "Зберегти відповідь"}
          </Button>
        </form>
      ) : null}

      {errorMessage ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div
          role="status"
          className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300"
        >
          {successMessage}
        </div>
      ) : null}
    </div>
  );
}
