"use client";

import { useState, type KeyboardEvent } from "react";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

const textareaClassName = cn(
  "flex max-h-40 min-h-[44px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
);

type ChatComposerProps = {
  disabled?: boolean;
  errorMessage?: string;
  onSend: (message: string) => Promise<void> | void;
};

export function ChatComposer({ disabled = false, errorMessage = "", onSend }: ChatComposerProps) {
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit() {
    const trimmed = text.trim();

    if (!trimmed || disabled || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSend(trimmed);
      setText("");
    } catch {
      // Keep typed text on failure; parent shows the error.
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  }

  return (
    <div className="shrink-0 border-t bg-background px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
      {errorMessage ? (
        <p role="alert" className="mb-2 text-xs text-destructive">
          {errorMessage}
        </p>
      ) : null}

      <div className="flex items-end gap-2">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || isSubmitting}
          placeholder="Напишіть повідомлення…"
          rows={2}
          className={textareaClassName}
        />
        <Button
          type="button"
          disabled={disabled || isSubmitting || !text.trim()}
          onClick={() => void submit()}
          className="shrink-0"
        >
          {isSubmitting ? "…" : "Надіслати"}
        </Button>
      </div>
    </div>
  );
}
