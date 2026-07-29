"use client";

import { useEffect, useRef, useState } from "react";

export type WordDocumentViewerProps = {
  fileBlob: Blob;
  onStatusChange?: (status: { phase: "loading" | "ready" | "error"; message?: string }) => void;
  onLoadError?: (message: string) => void;
};

export function WordDocumentViewer({
  fileBlob,
  onStatusChange,
  onLoadError,
}: WordDocumentViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    onStatusChange?.({ phase });
  }, [onStatusChange, phase]);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;

    async function renderDocument() {
      setPhase("loading");

      try {
        const { renderAsync } = await import("docx-preview");
        const buffer = await fileBlob.arrayBuffer();

        if (cancelled || !container) {
          return;
        }

        container.replaceChildren();
        await renderAsync(buffer, container, undefined, {
          className: "docx",
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          breakPages: true,
          renderHeaders: true,
          renderFooters: true,
        });

        if (!cancelled) {
          setPhase("ready");
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        const message = error instanceof Error ? error.message : "Unknown render error";
        console.error("DOCX render error:", message);
        onLoadError?.(message);
        setPhase("error");
      }
    }

    void renderDocument();

    return () => {
      cancelled = true;
      container?.replaceChildren();
    };
  }, [fileBlob, onLoadError]);

  if (phase === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Завантаження документа...
      </div>
    );
  }

  if (phase === "error") {
    return null;
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto rounded-md border bg-background p-4">
      <div ref={containerRef} className="docx-viewer mx-auto max-w-4xl bg-white text-black" />
    </div>
  );
}
