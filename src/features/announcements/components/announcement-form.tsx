"use client";

import { FormEvent, useRef, useState } from "react";

import { createAnnouncement, updateAnnouncement } from "@/features/announcements/actions";
import type { AnnouncementWithImages } from "@/features/announcements/actions";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { cn } from "@/shared/lib/utils";

const textareaClassName = cn(
  "flex min-h-[160px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
);

type AnnouncementFormProps = {
  mode: "create" | "edit";
  announcement?: AnnouncementWithImages;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function AnnouncementForm({
  mode,
  announcement,
  onSuccess,
  onCancel,
}: AnnouncementFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const form = formRef.current ?? event.currentTarget;
    const payload = new FormData(form);

    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      const result =
        mode === "create"
          ? await createAnnouncement(payload)
          : await updateAnnouncement(announcement!.id, payload);

      if (!result.success) {
        setErrorMessage(result.error);
        return;
      }

      if (mode === "create") {
        form.reset();
      }

      setSuccessMessage(mode === "create" ? "Оголошення створено." : "Оголошення збережено.");
      onSuccess?.();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Невідома помилка під час збереження.";

      setErrorMessage(message);
      console.error("Announcement form error:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form ref={formRef} className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor={`announcement-title-${mode}`}>Заголовок</Label>
        <Input
          id={`announcement-title-${mode}`}
          name="title"
          required
          disabled={isSubmitting}
          defaultValue={announcement?.title ?? ""}
          placeholder="Заголовок оголошення"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`announcement-content-${mode}`}>Текст оголошення</Label>
        <textarea
          id={`announcement-content-${mode}`}
          name="content"
          required
          disabled={isSubmitting}
          defaultValue={announcement?.content ?? ""}
          placeholder="Текст оголошення"
          className={textareaClassName}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="is_pinned"
            disabled={isSubmitting}
            defaultChecked={announcement?.is_pinned ?? false}
            className="size-4 rounded border border-input accent-primary"
          />
          <span>Закріпити</span>
        </label>

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="is_published"
            disabled={isSubmitting}
            defaultChecked={
              mode === "create" ? true : (announcement?.is_published ?? true)
            }
            className="size-4 rounded border border-input accent-primary"
          />
          <span>Опублікувати</span>
        </label>
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

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Збереження…" : "Зберегти"}
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
