"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type PdfDocumentViewerProps = {
  fileBlob: Blob;
  onCurrentPageChange?: (page: number) => void;
  onRenderProgress?: (renderedPages: number, totalPages: number) => void;
  onLoadError?: (message: string) => void;
};

type PageLayout = {
  pageNumber: number;
  cssWidth: number;
  cssHeight: number;
};

type PdfDocumentHandle = {
  destroy: () => Promise<void>;
  numPages: number;
  getPage: (pageNumber: number) => Promise<{
    getViewport: (params: { scale: number }) => { width: number; height: number };
    render: (params: {
      canvasContext: CanvasRenderingContext2D;
      viewport: { width: number; height: number };
      transform?: number[];
    }) => { promise: Promise<void>; cancel?: () => void };
  }>;
};

const INTERSECTION_ROOT_MARGIN = "120% 0px 120% 0px";
const INTERSECTION_THRESHOLD = [0, 0.1, 0.35, 0.55, 0.75];

function getRenderPixelRatio(): number {
  const devicePixelRatio = window.devicePixelRatio || 1;
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;

  if (deviceMemory !== undefined && deviceMemory < 4) {
    return Math.min(devicePixelRatio, 2);
  }

  return Math.min(devicePixelRatio, 3);
}

function PdfPageCanvas({ canvas }: { canvas: HTMLCanvasElement }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;

    if (!host) {
      return;
    }

    canvas.style.width = "100%";
    canvas.style.maxWidth = `${canvas.dataset.cssWidth}px`;
    canvas.style.aspectRatio = `${canvas.dataset.cssWidth} / ${canvas.dataset.cssHeight}`;
    canvas.style.height = "auto";
    canvas.style.touchAction = "auto";
    canvas.className = "block rounded-md border bg-white shadow-sm";

    host.replaceChildren(canvas);

    return () => {
      if (host.contains(canvas)) {
        host.removeChild(canvas);
      }
    };
  }, [canvas]);

  return (
    <div
      ref={hostRef}
      className="flex w-full justify-center"
      style={{ touchAction: "auto" }}
    />
  );
}

function PagePlaceholder({ layout }: { layout: PageLayout }) {
  return (
    <div
      className="flex w-full justify-center"
      style={{
        minHeight: layout.cssHeight,
        touchAction: "auto",
      }}
    >
      <div
        className="w-full max-w-full rounded-md border bg-muted/30 shadow-sm"
        style={{
          width: layout.cssWidth,
          height: layout.cssHeight,
        }}
      />
    </div>
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
  const pdfDocumentRef = useRef<PdfDocumentHandle | null>(null);
  const renderTasksRef = useRef<Map<number, { cancel?: () => void }>>(new Map());
  const renderingPagesRef = useRef<Set<number>>(new Set());
  const renderedPagesRef = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const availableWidthRef = useRef(0);
  const pixelRatioRef = useRef(1);
  const cancelledRef = useRef(false);

  const onCurrentPageChangeRef = useRef(onCurrentPageChange);
  const onRenderProgressRef = useRef(onRenderProgress);
  const onLoadErrorRef = useRef(onLoadError);

  const [pageLayouts, setPageLayouts] = useState<PageLayout[]>([]);
  const [renderedPages, setRenderedPages] = useState<Map<number, HTMLCanvasElement>>(new Map());
  const [isInitializing, setIsInitializing] = useState(true);

  onCurrentPageChangeRef.current = onCurrentPageChange;
  onRenderProgressRef.current = onRenderProgress;
  onLoadErrorRef.current = onLoadError;

  const reportRenderProgress = useCallback((totalPages: number) => {
    onRenderProgressRef.current?.(renderedPagesRef.current.size, totalPages);
  }, []);

  const renderPage = useCallback(async (pageNumber: number, pdfDocument: PdfDocumentHandle) => {
      if (
        cancelledRef.current ||
        renderedPagesRef.current.has(pageNumber) ||
        renderingPagesRef.current.has(pageNumber)
      ) {
        return;
      }

      renderingPagesRef.current.add(pageNumber);

      try {
        const page = await pdfDocument.getPage(pageNumber);

        if (cancelledRef.current) {
          return;
        }

        const baseViewport = page.getViewport({ scale: 1 });
        const cssScale = availableWidthRef.current / baseViewport.width;
        const cssViewport = page.getViewport({ scale: cssScale });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error("Canvas context unavailable");
        }

        const pixelRatio = pixelRatioRef.current;
        canvas.width = Math.floor(cssViewport.width * pixelRatio);
        canvas.height = Math.floor(cssViewport.height * pixelRatio);
        canvas.dataset.cssWidth = String(Math.floor(cssViewport.width));
        canvas.dataset.cssHeight = String(Math.floor(cssViewport.height));

        const transform =
          pixelRatio !== 1 ? [pixelRatio, 0, 0, pixelRatio, 0, 0] : undefined;

        const renderTask = page.render({
          canvasContext: context,
          viewport: cssViewport,
          transform,
        });

        renderTasksRef.current.set(pageNumber, renderTask);
        await renderTask.promise;

        if (cancelledRef.current) {
          return;
        }

        renderedPagesRef.current.set(pageNumber, canvas);
        setRenderedPages(new Map(renderedPagesRef.current));
        reportRenderProgress(pdfDocument.numPages);
      } catch (error) {
        if (!cancelledRef.current) {
          const message =
            error instanceof Error ? error.message : "Unknown PDF rendering error";
          console.error("PDF page render error:", error);
          onLoadErrorRef.current?.(message);
        }
      } finally {
        renderingPagesRef.current.delete(pageNumber);
        renderTasksRef.current.delete(pageNumber);
      }
  }, [reportRenderProgress]);

  const queueVisiblePages = useCallback((pdfDocument: PdfDocumentHandle) => {
      const root = scrollRef.current;

      if (!root) {
        return;
      }

      const rootRect = root.getBoundingClientRect();

      for (const [pageNumber, element] of pageRefs.current.entries()) {
        const rect = element.getBoundingClientRect();
        const isNearViewport =
          rect.bottom >= rootRect.top - rootRect.height &&
          rect.top <= rootRect.bottom + rootRect.height;

        if (isNearViewport) {
          void renderPage(pageNumber, pdfDocument);
        }
      }
  }, [renderPage]);

  useEffect(() => {
    cancelledRef.current = false;
    renderedPagesRef.current = new Map();
    renderingPagesRef.current = new Set();
    renderTasksRef.current = new Map();
    setRenderedPages(new Map());
    setPageLayouts([]);
    setIsInitializing(true);

    async function initializePdf() {
      try {
        const pdfjs = await import("pdfjs-dist");

        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const data = await fileBlob.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data });
        const pdfDocument = (await loadingTask.promise) as unknown as PdfDocumentHandle;

        if (cancelledRef.current) {
          await pdfDocument.destroy();
          return;
        }

        pdfDocumentRef.current = pdfDocument;

        const containerWidth = scrollRef.current?.clientWidth ?? window.innerWidth;
        availableWidthRef.current = Math.max(containerWidth - 32, 280);
        pixelRatioRef.current = getRenderPixelRatio();

        const layouts: PageLayout[] = [];

        for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
          const page = await pdfDocument.getPage(pageNumber);
          const baseViewport = page.getViewport({ scale: 1 });
          const cssScale = availableWidthRef.current / baseViewport.width;
          const cssViewport = page.getViewport({ scale: cssScale });

          layouts.push({
            pageNumber,
            cssWidth: Math.floor(cssViewport.width),
            cssHeight: Math.floor(cssViewport.height),
          });
        }

        if (cancelledRef.current) {
          await pdfDocument.destroy();
          return;
        }

        setPageLayouts(layouts);
        onRenderProgressRef.current?.(0, pdfDocument.numPages);
        setIsInitializing(false);
        queueVisiblePages(pdfDocument);
      } catch (error) {
        if (!cancelledRef.current) {
          const message =
            error instanceof Error ? error.message : "Unknown PDF rendering error";
          console.error("PDF render error:", error);
          onLoadErrorRef.current?.(message);
          setIsInitializing(false);
        }
      }
    }

    void initializePdf();

    return () => {
      cancelledRef.current = true;

      for (const task of renderTasksRef.current.values()) {
        task.cancel?.();
      }

      renderTasksRef.current.clear();
      renderingPagesRef.current.clear();
      renderedPagesRef.current.clear();

      if (pdfDocumentRef.current) {
        void pdfDocumentRef.current.destroy();
        pdfDocumentRef.current = null;
      }
    };
  }, [fileBlob, queueVisiblePages]);

  useEffect(() => {
    const pdfDocument = pdfDocumentRef.current;

    if (!pdfDocument || pageLayouts.length === 0) {
      return;
    }

    const activePdfDocument = pdfDocument;

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

        if (topEntry) {
          const pageNumber = Number(topEntry.target.getAttribute("data-page-number"));

          if (pageNumber > 0) {
            onCurrentPageChangeRef.current?.(pageNumber);
          }
        }

        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }

          const pageNumber = Number(entry.target.getAttribute("data-page-number"));

          if (pageNumber > 0) {
            void renderPage(pageNumber, activePdfDocument);
          }
        }
      },
      {
        root,
        rootMargin: INTERSECTION_ROOT_MARGIN,
        threshold: INTERSECTION_THRESHOLD,
      },
    );

    pageRefs.current.forEach((element) => {
      observer.observe(element);
    });

    function handleScroll() {
      queueVisiblePages(activePdfDocument);
    }

    root.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      root.removeEventListener("scroll", handleScroll);
    };
  }, [pageLayouts, queueVisiblePages, renderPage]);

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
        {pageLayouts.map((layout) => {
          const canvas = renderedPages.get(layout.pageNumber);

          return (
            <div
              key={layout.pageNumber}
              ref={(element) => setPageRef(layout.pageNumber, element)}
              data-page-number={layout.pageNumber}
            >
              {canvas ? <PdfPageCanvas canvas={canvas} /> : <PagePlaceholder layout={layout} />}
            </div>
          );
        })}

        {isInitializing && pageLayouts.length === 0 ? (
          <div className="flex min-h-[40dvh] items-center justify-center text-sm text-muted-foreground">
            Завантаження документа...
          </div>
        ) : null}
      </div>
    </div>
  );
}
