"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { createQuestion } from "@/features/questions/actions";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { cn } from "@/shared/lib/utils";

const textareaClassName = cn(
  "flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
);

type QuestionFormProps = {
  onCancel?: () => void;
};

export function QuestionForm({ onCancel }: QuestionFormProps) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      const formData = new FormData(event.currentTarget);
      const result = await createQuestion(formData);

      if (!result.success) {
        setErrorMessage(result.error);
        return;
      }

      event.currentTarget.reset();
      setSuccessMessage("Запитання надіслано.");
      router.refresh();

      if (onCancel) {
        onCancel();
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Невідома помилка під час надсилання.";

      setErrorMessage(message);
      console.error("Create question error:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="question-subject">Тема</Label>
        <Input
          id="question-subject"
          name="subject"
          type="text"
          required
          disabled={isSubmitting}
          placeholder="Коротко опишіть тему"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="question-message">Повідомлення</Label>
        <textarea
          id="question-message"
          name="message"
          required
          disabled={isSubmitting}
          placeholder="Деталі вашого запитання"
          className={textareaClassName}
        />
      </div>

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

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Надсилання…" : "Надіслати"}
        </Button>

        {onCancel ? (
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={onCancel}>
            Скасувати
          </Button>
        ) : null}
      </div>
    </form>
  );
}
