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
  cssWidth: number;
  cssHeight: number;
  canvas: HTMLCanvasElement;
};

function getRenderPixelRatio(): number {
  const devicePixelRatio = window.devicePixelRatio || 1;
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;

  if (deviceMemory !== undefined && deviceMemory < 4) {
    return Math.min(devicePixelRatio, 2);
  }

  return Math.min(devicePixelRatio, 3);
}

function PdfPageCanvas({ page }: { page: PageRenderState }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;

    if (!host) {
      return;
    }

    page.canvas.style.width = "100%";
    page.canvas.style.maxWidth = `${page.cssWidth}px`;
    page.canvas.style.aspectRatio = `${page.cssWidth} / ${page.cssHeight}`;
    page.canvas.style.height = "auto";
    page.canvas.style.touchAction = "auto";
    page.canvas.className = "block rounded-md border bg-white shadow-sm";

    host.replaceChildren(page.canvas);

    return () => {
      if (host.contains(page.canvas)) {
        host.removeChild(page.canvas);
      }
    };
  }, [page]);

  return (
    <div
      ref={hostRef}
      className="flex w-full justify-center"
      style={{ touchAction: "auto" }}
    />
  );
}

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
        const pixelRatio = getRenderPixelRatio();
        const renderedPages: PageRenderState[] = [];

        for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
          if (cancelled) {
            break;
          }

          const page = await pdfDocument.getPage(pageNumber);
          const baseViewport = page.getViewport({ scale: 1 });
          const cssScale = availableWidth / baseViewport.width;
          const cssViewport = page.getViewport({ scale: cssScale });
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");

          if (!context) {
            throw new Error("Canvas context unavailable");
          }

          canvas.width = Math.floor(cssViewport.width * pixelRatio);
          canvas.height = Math.floor(cssViewport.height * pixelRatio);

          const transform =
            pixelRatio !== 1
              ? [pixelRatio, 0, 0, pixelRatio, 0, 0]
              : undefined;

          const renderTask = page.render({
            canvasContext: context,
            viewport: cssViewport,
            transform,
          });

          renderTaskRef.current = renderTask;
          await renderTask.promise;

          renderedPages.push({
            pageNumber,
            cssWidth: Math.floor(cssViewport.width),
            cssHeight: Math.floor(cssViewport.height),
            canvas,
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
          >
            <PdfPageCanvas page={page} />
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
