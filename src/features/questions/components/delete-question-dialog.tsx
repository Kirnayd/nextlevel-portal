"use client";

import { useEffect } from "react";

import { Button } from "@/shared/components/ui/button";

type DeleteQuestionDialogProps = {
  open: boolean;
  isDeleting: boolean;
  errorMessage: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeleteQuestionDialog({
  open,
  isDeleting,
  errorMessage,
  onCancel,
  onConfirm,
}: DeleteQuestionDialogProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isDeleting) {
        onCancel();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, isDeleting, onCancel]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={() => {
        if (!isDeleting) {
          onCancel();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-question-title"
        className="w-full max-w-md space-y-4 rounded-lg border bg-background p-6 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="space-y-2">
          <h2 id="delete-question-title" className="text-lg font-semibold">
            Видалити запитання?
          </h2>
          <p className="text-sm text-muted-foreground">Цю дію неможливо скасувати.</p>
        </div>

        {errorMessage ? (
          <div
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {errorMessage}
          </div>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" disabled={isDeleting} onClick={onCancel}>
            Скасувати
          </Button>
          <Button type="button" variant="destructive" disabled={isDeleting} onClick={onConfirm}>
            {isDeleting ? "Видалення…" : "Видалити"}
          </Button>
        </div>
      </div>
    </div>
  );
}
