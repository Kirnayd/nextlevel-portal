"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, FileText } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  canPreviewInline,
  formatFileSize,
  isOfficeMimeType,
} from "@/shared/lib/file-types";

export type FileViewerProps = {
  open: boolean;
  onClose: () => void;
  downloadUrl: string;
  filename: string;
  mimeType: string;
  fileTypeLabel: string;
  sizeBytes?: number | null;
};

export function FileViewer({
  open,
  onClose,
  downloadUrl,
  filename,
  mimeType,
  fileTypeLabel,
  sizeBytes,
}: FileViewerProps) {
  const titleId = useId();
  const pushedHistoryRef = useRef(false);
  const previewUrlRef = useRef<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const formattedSize = formatFileSize(sizeBytes);
  const showInlinePreview = canPreviewInline(mimeType);
  const showOfficeFallback = isOfficeMimeType(mimeType);

  const revokePreviewUrl = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    setPreviewUrl(null);
  }, []);

  const handleClose = useCallback(() => {
    if (pushedHistoryRef.current) {
      pushedHistoryRef.current = false;
      window.history.back();
      return;
    }

    onClose();
  }, [onClose]);

  const handleSwipeTouchStart = useCallback((event: React.TouchEvent<HTMLElement>) => {
    if (event.touches.length > 1) {
      touchStartRef.current = null;
      return;
    }

    if (contentRef.current && contentRef.current.scrollTop > 0) {
      touchStartRef.current = null;
      return;
    }

    const touch = event.touches[0];

    if (!touch) {
      return;
    }

    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
  }, []);

  const handleSwipeTouchEnd = useCallback(
    (event: React.TouchEvent<HTMLElement>) => {
      if (event.touches.length > 0 || event.changedTouches.length > 1) {
        touchStartRef.current = null;
        return;
      }

      const start = touchStartRef.current;
      touchStartRef.current = null;

      if (!start) {
        return;
      }

      const touch = event.changedTouches[0];

      if (!touch) {
        return;
      }

      const deltaY = touch.clientY - start.y;
      const deltaX = touch.clientX - start.x;

      if (deltaY > 80 && Math.abs(deltaY) > Math.abs(deltaX) * 1.5) {
        handleClose();
      }
    },
    [handleClose],
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      document.body.style.overflow = "";
      revokePreviewUrl();
      setHasError(false);
      setIsLoading(false);
      return;
    }

    document.body.style.overflow = "hidden";
    window.history.pushState({ nextlevelFileViewer: true }, "");
    pushedHistoryRef.current = true;

    function handlePopState() {
      pushedHistoryRef.current = false;
      onClose();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        handleClose();
      }
    }

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose, handleClose, revokePreviewUrl]);

  useEffect(() => {
    if (!open || !showInlinePreview) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    async function loadPreview() {
      setIsLoading(true);
      setHasError(false);
      revokePreviewUrl();

      try {
        const response = await fetch(downloadUrl, {
          credentials: "include",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to load file: ${response.status}`);
        }

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);

        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }

        previewUrlRef.current = objectUrl;
        setPreviewUrl(objectUrl);
      } catch (error) {
        if (!cancelled && !(error instanceof DOMException && error.name === "AbortError")) {
          console.error("File viewer preview error:", error);
          setHasError(true);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadPreview();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [open, showInlinePreview, downloadUrl, revokePreviewUrl]);

  if (!open || !isMounted) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-background"
      style={{ height: "100dvh" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <header
        className="sticky top-0 z-10 flex shrink-0 items-center justify-end border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90"
        onTouchStart={handleSwipeTouchStart}
        onTouchEnd={handleSwipeTouchEnd}
      >
        <div className="flex w-full items-center justify-end px-[max(1rem,env(safe-area-inset-left))] pb-3 pt-[max(1rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))]">
          <Button type="button" variant="outline" onClick={handleClose}>
            ✕ Закрити
          </Button>
        </div>
      </header>

      <div
        ref={contentRef}
        className={
          showInlinePreview
            ? "min-h-0 flex-1 overflow-hidden pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] touch-auto"
            : "min-h-0 flex-1 overflow-auto pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]"
        }
        onTouchStart={showInlinePreview ? undefined : handleSwipeTouchStart}
        onTouchEnd={showInlinePreview ? undefined : handleSwipeTouchEnd}
      >
        {showInlinePreview ? (
          <div className="flex h-full min-h-[50dvh] flex-col touch-auto">
            {isLoading ? (
              <div className="flex flex-1 items-center justify-center px-4 text-sm text-muted-foreground">
                Завантаження документа...
              </div>
            ) : null}

            {hasError ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
                <p className="text-sm text-destructive">Не вдалося відкрити документ</p>
                <Button asChild>
                  <a href={downloadUrl} download={filename}>
                    <Download />
                    Завантажити файл
                  </a>
                </Button>
              </div>
            ) : null}

            {!isLoading && !hasError && previewUrl ? (
              <iframe
                title={filename}
                src={previewUrl}
                className="h-full min-h-[70dvh] w-full touch-auto border-0 bg-background"
                style={{ touchAction: "auto" }}
              />
            ) : null}
          </div>
        ) : null}

        {showOfficeFallback ? (
          <div className="mx-auto flex w-full max-w-lg flex-col gap-6 py-8">
            <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4">
              <FileText className="mt-0.5 size-5 shrink-0 text-primary" />
              <div className="min-w-0 space-y-1">
                <p id={titleId} className="break-words font-medium">
                  {filename}
                </p>
                <p className="text-sm text-muted-foreground">{fileTypeLabel}</p>
                {formattedSize ? (
                  <p className="text-sm text-muted-foreground">{formattedSize}</p>
                ) : null}
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Попередній перегляд цього формату недоступний.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <a href={downloadUrl} download={filename}>
                  <Download />
                  Завантажити файл
                </a>
              </Button>
              <Button type="button" variant="outline" onClick={handleClose}>
                ✕ Закрити
              </Button>
            </div>
          </div>
        ) : null}

        {!showInlinePreview && !showOfficeFallback ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-8 text-center">
            <p className="break-words font-medium">{filename}</p>
            <p className="text-sm text-muted-foreground">{fileTypeLabel}</p>
            <Button asChild>
              <a href={downloadUrl} download={filename}>
                <Download />
                Завантажити файл
              </a>
            </Button>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
