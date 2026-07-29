"use client";

import { FormEvent, useEffect, useState } from "react";

import { createSubcategory } from "@/features/documents/actions";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

type CreateSubcategoryDialogProps = {
  categoryId: string;
  open: boolean;
  onClose: () => void;
};

export function CreateSubcategoryDialog({
  categoryId,
  open,
  onClose,
}: CreateSubcategoryDialogProps) {
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setErrorMessage("");
      setSuccessMessage("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, isSubmitting, onClose]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;

    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      const formData = new FormData(form);
      const result = await createSubcategory(categoryId, formData);

      if (!result.success) {
        setErrorMessage(result.error);
        return;
      }

      form.reset();
      setSuccessMessage("Підкатегорію створено.");
      onClose();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Невідома помилка під час створення.";

      setErrorMessage(message);
      console.error("Create subcategory error:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={() => {
        if (!isSubmitting) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-subcategory-title"
        className="w-full max-w-md space-y-4 rounded-lg border bg-background p-6 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="create-subcategory-title" className="text-lg font-semibold">
          Нова підкатегорія
        </h2>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor={`subcategory-name-${categoryId}`}>Назва підкатегорії</Label>
            <Input
              id={`subcategory-name-${categoryId}`}
              name="name"
              required
              disabled={isSubmitting}
              autoFocus
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

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>
              Скасувати
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Створення…" : "Створити"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
