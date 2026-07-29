"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type PdfDocumentViewerProps = {
  fileBlob: Blob;
  onCurrentPageChange?: (page: number) => void;
  onRenderProgress?: (renderedPages: number, totalPages: number) => void;
  onLoadError?: (message: string) => void;
};

type PageRenderState = {
  pageNumber: number;
  width: number;
  height: number;
  dataUrl: string;
};

export function PdfDocumentViewer({
  fileBlob,
  onCurrentPageChange,
  onRenderProgress,
  onLoadError,
}: PdfDocumentViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const pdfDocumentRef = useRef<{ destroy: () => Promise<void> } | null>(null);
  const renderTaskRef = useRef<{ cancel?: () => void } | null>(null);
  const onCurrentPageChangeRef = useRef(onCurrentPageChange);
  const onRenderProgressRef = useRef(onRenderProgress);
  const onLoadErrorRef = useRef(onLoadError);
  const [pages, setPages] = useState<PageRenderState[]>([]);
  const [isRendering, setIsRendering] = useState(true);

  onCurrentPageChangeRef.current = onCurrentPageChange;
  onRenderProgressRef.current = onRenderProgress;
  onLoadErrorRef.current = onLoadError;

  useEffect(() => {
    let cancelled = false;

    async function renderPdf() {
      setIsRendering(true);
      setPages([]);

      try {
        const pdfjs = await import("pdfjs-dist");

        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const data = await fileBlob.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data });
        const pdfDocument = await loadingTask.promise;

        if (cancelled) {
          await pdfDocument.destroy();
          return;
        }

        pdfDocumentRef.current = pdfDocument;
        onRenderProgressRef.current?.(0, pdfDocument.numPages);

        const containerWidth = scrollRef.current?.clientWidth ?? window.innerWidth;
        const availableWidth = Math.max(containerWidth - 32, 280);
        const renderedPages: PageRenderState[] = [];

        for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
          if (cancelled) {
            break;
          }

          const page = await pdfDocument.getPage(pageNumber);
          const baseViewport = page.getViewport({ scale: 1 });
          const scale = availableWidth / baseViewport.width;
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");

          if (!context) {
            throw new Error("Canvas context unavailable");
          }

          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);

          const renderTask = page.render({
            canvasContext: context,
            viewport,
          });

          renderTaskRef.current = renderTask;
          await renderTask.promise;

          renderedPages.push({
            pageNumber,
            width: canvas.width,
            height: canvas.height,
            dataUrl: canvas.toDataURL("image/png"),
          });

          if (!cancelled) {
            setPages([...renderedPages]);
            onRenderProgressRef.current?.(renderedPages.length, pdfDocument.numPages);
          }
        }
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error ? error.message : "Unknown PDF rendering error";
          console.error("PDF render error:", error);
          onLoadErrorRef.current?.(message);
        }
      } finally {
        if (!cancelled) {
          setIsRendering(false);
        }
      }
    }

    void renderPdf();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel?.();
      renderTaskRef.current = null;

      if (pdfDocumentRef.current) {
        void pdfDocumentRef.current.destroy();
        pdfDocumentRef.current = null;
      }
    };
  }, [fileBlob]);

  useEffect(() => {
    if (pages.length === 0) {
      return;
    }

    const root = scrollRef.current;

    if (!root) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio);

        const topEntry = visibleEntries[0];

        if (!topEntry) {
          return;
        }

        const pageNumber = Number(topEntry.target.getAttribute("data-page-number"));

        if (pageNumber > 0) {
          onCurrentPageChangeRef.current?.(pageNumber);
        }
      },
      {
        root,
        threshold: [0.35, 0.55, 0.75],
      },
    );

    pageRefs.current.forEach((element) => {
      observer.observe(element);
    });

    return () => {
      observer.disconnect();
    };
  }, [pages]);

  const setPageRef = useCallback((pageNumber: number, element: HTMLDivElement | null) => {
    if (element) {
      pageRefs.current.set(pageNumber, element);
      return;
    }

    pageRefs.current.delete(pageNumber);
  }, []);

  return (
    <div
      ref={scrollRef}
      className="h-full min-h-0 overflow-y-auto overscroll-contain px-2 pb-4 touch-auto"
      style={{ WebkitOverflowScrolling: "touch", touchAction: "auto" }}
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 py-2">
        {pages.map((page) => (
          <div
            key={page.pageNumber}
            ref={(element) => setPageRef(page.pageNumber, element)}
            data-page-number={page.pageNumber}
            className="flex justify-center"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={page.dataUrl}
              alt={`Сторінка ${page.pageNumber}`}
              width={page.width}
              height={page.height}
              className="h-auto max-w-full rounded-md border bg-white shadow-sm"
              style={{ touchAction: "auto" }}
              draggable={false}
            />
          </div>
        ))}

        {isRendering && pages.length === 0 ? (
          <div className="flex min-h-[40dvh] items-center justify-center text-sm text-muted-foreground">
            Завантаження документа...
          </div>
        ) : null}
      </div>
    </div>
  );
}
