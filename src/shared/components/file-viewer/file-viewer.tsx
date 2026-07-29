"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, FileText, Share2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  canPreviewInline,
  formatFileSize,
  isOfficeMimeType,
} from "@/shared/lib/file-types";
import {
  downloadFileBlob,
  fetchAuthenticatedFileBlob,
  shareAuthenticatedFile,
} from "@/shared/lib/share-file";

const PdfDocumentViewer = dynamic(
  () =>
    import("@/shared/components/file-viewer/pdf-document-viewer").then(
      (module) => module.PdfDocumentViewer,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[40dvh] items-center justify-center text-sm text-muted-foreground">
        Завантаження документа...
      </div>
    ),
  },
);

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
  const fileBlobRef = useRef<Blob | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [fileBlob, setFileBlob] = useState<Blob | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [renderedPages, setRenderedPages] = useState(0);
  const [isSharing, setIsSharing] = useState(false);
  const [shareError, setShareError] = useState("");
  const [shareFallbackMessage, setShareFallbackMessage] = useState("");

  const formattedSize = formatFileSize(sizeBytes);
  const showInlinePreview = canPreviewInline(mimeType);
  const showOfficeFallback = isOfficeMimeType(mimeType);

  const resetViewerState = useCallback(() => {
    fileBlobRef.current = null;
    setFileBlob(null);
    setHasError(false);
    setIsLoading(false);
    setCurrentPage(1);
    setTotalPages(0);
    setRenderedPages(0);
    setIsSharing(false);
    setShareError("");
    setShareFallbackMessage("");
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

  const ensureFileBlob = useCallback(async (): Promise<Blob> => {
    if (fileBlobRef.current) {
      return fileBlobRef.current;
    }

    const blob = await fetchAuthenticatedFileBlob(downloadUrl);
    fileBlobRef.current = blob;
    setFileBlob(blob);
    return blob;
  }, [downloadUrl]);

  const handleShare = useCallback(async () => {
    setShareError("");
    setShareFallbackMessage("");
    setIsSharing(true);

    try {
      const blob = await ensureFileBlob();
      const result = await shareAuthenticatedFile({
        blob,
        filename,
        mimeType,
      });

      if (result === "downloaded") {
        setShareFallbackMessage(
          "Файл завантажено. Відкрийте його в меню завантажень, щоб поділитися.",
        );
      }
    } catch (error) {
      console.error("Share file error:", error);
      setShareError("Не вдалося поділитися файлом.");
    } finally {
      setIsSharing(false);
    }
  }, [ensureFileBlob, filename, mimeType]);

  const handleDownload = useCallback(async () => {
    try {
      const blob = await ensureFileBlob();
      downloadFileBlob(blob, filename);
    } catch (error) {
      console.error("Download file error:", error);
      setShareError("Не вдалося відкрити документ");
    }
  }, [ensureFileBlob, filename]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      document.body.style.overflow = "";
      resetViewerState();
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
  }, [open, onClose, handleClose, resetViewerState]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    async function loadFile() {
      setIsLoading(true);
      setHasError(false);
      setFileBlob(null);
      fileBlobRef.current = null;
      setCurrentPage(1);
      setTotalPages(0);
      setRenderedPages(0);
      setShareError("");
      setShareFallbackMessage("");

      try {
        const blob = await fetchAuthenticatedFileBlob(downloadUrl, controller.signal);
        fileBlobRef.current = blob;

        if (!cancelled) {
          setFileBlob(blob);
        }
      } catch (error) {
        if (!cancelled && !(error instanceof DOMException && error.name === "AbortError")) {
          console.error("File viewer load error:", error);
          setHasError(true);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadFile();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [open, downloadUrl]);

  const handleRenderProgress = useCallback((rendered: number, total: number) => {
    setRenderedPages(rendered);
    setTotalPages(total);
  }, []);

  if (!open || !isMounted) {
    return null;
  }

  const pageIndicator =
    showInlinePreview && totalPages > 0
      ? `Сторінка ${currentPage} з ${totalPages}`
      : null;

  const renderProgress =
    showInlinePreview && totalPages > 0 && renderedPages < totalPages
      ? `Завантаження... ${renderedPages}/${totalPages}`
      : null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-background"
      style={{ height: "100dvh" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <header
        className="sticky top-0 z-20 shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90"
        onTouchStart={handleSwipeTouchStart}
        onTouchEnd={handleSwipeTouchEnd}
      >
        <div className="space-y-2 px-[max(1rem,env(safe-area-inset-left))] pb-3 pt-[max(1rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))]">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p id={titleId} className="truncate text-sm font-medium">
                {filename}
              </p>
              {pageIndicator ? (
                <p className="text-xs text-muted-foreground">{pageIndicator}</p>
              ) : null}
              {renderProgress ? (
                <p className="text-xs text-muted-foreground">{renderProgress}</p>
              ) : null}
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isLoading || hasError || isSharing}
                onClick={() => void handleShare()}
              >
                <Share2 className="size-4" />
                {isSharing ? "Підготовка файлу..." : "Поділитися"}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleClose}>
                ✕ Закрити
              </Button>
            </div>
          </div>

          {shareError ? (
            <p role="alert" className="text-xs text-destructive">
              {shareError}
            </p>
          ) : null}

          {shareFallbackMessage ? (
            <p role="status" className="text-xs text-muted-foreground">
              {shareFallbackMessage}
            </p>
          ) : null}
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
        {isLoading ? (
          <div className="flex min-h-[50dvh] items-center justify-center px-4 text-sm text-muted-foreground">
            Завантаження документа...
          </div>
        ) : null}

        {hasError ? (
          <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-4 px-4 text-center">
            <p className="text-sm text-destructive">Не вдалося відкрити документ</p>
            <Button type="button" onClick={() => void handleDownload()}>
              <Download />
              Завантажити файл
            </Button>
          </div>
        ) : null}

        {!isLoading && !hasError && showInlinePreview && fileBlob ? (
          <PdfDocumentViewer
            fileBlob={fileBlob}
            onCurrentPageChange={setCurrentPage}
            onRenderProgress={handleRenderProgress}
            onLoadError={() => setHasError(true)}
          />
        ) : null}

        {!isLoading && !hasError && showOfficeFallback ? (
          <div className="mx-auto flex w-full max-w-lg flex-col gap-6 py-8">
            <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4">
              <FileText className="mt-0.5 size-5 shrink-0 text-primary" />
              <div className="min-w-0 space-y-1">
                <p className="break-words font-medium">{filename}</p>
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
              <Button
                type="button"
                disabled={isSharing}
                onClick={() => void handleShare()}
              >
                <Share2 />
                {isSharing ? "Підготовка файлу..." : "Поділитися"}
              </Button>
              <Button type="button" variant="outline" onClick={() => void handleDownload()}>
                <Download />
                Завантажити файл
              </Button>
              <Button type="button" variant="outline" onClick={handleClose}>
                ✕ Закрити
              </Button>
            </div>
          </div>
        ) : null}

        {!isLoading && !hasError && !showInlinePreview && !showOfficeFallback ? (
          <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-4 px-4 py-8 text-center">
            <p className="break-words font-medium">{filename}</p>
            <p className="text-sm text-muted-foreground">{fileTypeLabel}</p>
            <Button type="button" onClick={() => void handleDownload()}>
              <Download />
              Завантажити файл
            </Button>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
