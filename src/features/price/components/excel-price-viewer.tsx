"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type UIEvent,
} from "react";
import { createPortal } from "react-dom";
import { Download, Share2 } from "lucide-react";

import {
  EXCEL_VIEWER_OVERSCAN,
  EXCEL_VIEWER_ROW_HEIGHT,
} from "@/features/price/constants";
import {
  buildMergeMaps,
  isWorkbookTooLarge,
  parseExcelWorkbook,
  searchWorksheet,
  type SearchMatch,
  type WorkbookData,
  type WorksheetData,
} from "@/features/price/lib/parse-excel-workbook";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  downloadFileBlob,
  fetchAuthenticatedFileBlob,
  shareAuthenticatedFile,
} from "@/shared/lib/share-file";
import { cn } from "@/shared/lib/utils";

export type ExcelPriceViewerProps = {
  open: boolean;
  onClose: () => void;
  downloadUrl: string;
  filename: string;
  mimeType: string;
};

type ViewerPhase = "loading" | "parsing" | "ready" | "too-large" | "error";

function VirtualizedWorksheetTable({
  worksheet,
  activeMatchIndex,
  matches,
  onScrollContainerChange,
}: {
  worksheet: WorksheetData;
  activeMatchIndex: number;
  matches: SearchMatch[];
  onScrollContainerChange?: (element: HTMLDivElement | null) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(480);

  const { skipCells, spanCells } = useMemo(
    () => buildMergeMaps(worksheet.merges),
    [worksheet.merges],
  );

  const headerRow = worksheet.rows[0] ?? [];
  const bodyRows = worksheet.rows.slice(1);
  const bodyRowOffset = 1;

  const visibleStart = Math.max(
    0,
    Math.floor(scrollTop / EXCEL_VIEWER_ROW_HEIGHT) - EXCEL_VIEWER_OVERSCAN,
  );
  const visibleCount =
    Math.ceil(viewportHeight / EXCEL_VIEWER_ROW_HEIGHT) + EXCEL_VIEWER_OVERSCAN * 2;
  const visibleEnd = Math.min(bodyRows.length, visibleStart + visibleCount);
  const topSpacerHeight = visibleStart * EXCEL_VIEWER_ROW_HEIGHT;
  const bottomSpacerHeight = Math.max(0, (bodyRows.length - visibleEnd) * EXCEL_VIEWER_ROW_HEIGHT);

  const matchKeys = useMemo(
    () => new Set(matches.map((match) => `${match.row},${match.col}`)),
    [matches],
  );

  const activeMatch = matches[activeMatchIndex] ?? null;

  useEffect(() => {
    onScrollContainerChange?.(scrollRef.current);
  }, [onScrollContainerChange]);

  useEffect(() => {
    const element = scrollRef.current;

    if (!element) {
      return;
    }

    const observer = new ResizeObserver(() => {
      setViewportHeight(element.clientHeight);
    });

    observer.observe(element);
    setViewportHeight(element.clientHeight);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!activeMatch || !scrollRef.current) {
      return;
    }

    if (activeMatch.row === 0) {
      scrollRef.current.scrollTop = 0;
      return;
    }

    const targetTop = (activeMatch.row - bodyRowOffset) * EXCEL_VIEWER_ROW_HEIGHT;
    scrollRef.current.scrollTop = Math.max(0, targetTop - viewportHeight / 2);
  }, [activeMatch, bodyRowOffset, viewportHeight]);

  function renderCell(rowIndex: number, colIndex: number, value: string, isHeader: boolean) {
    const cellKey = `${rowIndex},${colIndex}`;

    if (skipCells.has(cellKey)) {
      return null;
    }

    const merge = spanCells.get(cellKey);
    const isMatch = matchKeys.has(cellKey);
    const isActive = activeMatch?.row === rowIndex && activeMatch.col === colIndex;
    const CellTag = isHeader ? "th" : "td";

    return (
      <CellTag
        key={cellKey}
        rowSpan={merge?.rowSpan}
        colSpan={merge?.colSpan}
        className={cn(
          "min-w-[7rem] max-w-[20rem] border border-border px-2 py-1 text-left text-xs align-top",
          isHeader && "sticky top-0 z-20 bg-muted font-semibold",
          colIndex === 0 &&
            "sticky left-0 z-10 bg-background after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-border",
          isHeader && colIndex === 0 && "z-30 bg-muted",
          isMatch && "bg-yellow-100 dark:bg-yellow-900/40",
          isActive && "ring-2 ring-inset ring-primary",
        )}
        style={{ height: EXCEL_VIEWER_ROW_HEIGHT }}
      >
        <span className="block truncate">{value}</span>
      </CellTag>
    );
  }

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    setScrollTop(event.currentTarget.scrollTop);
  }

  return (
    <div
      ref={scrollRef}
      className="min-h-0 flex-1 overflow-auto rounded-md border bg-background"
      onScroll={handleScroll}
    >
      <table className="min-w-max border-collapse">
        <thead>
          <tr>
            {headerRow.map((value, colIndex) => renderCell(0, colIndex, value, true))}
          </tr>
        </thead>
        <tbody>
          {topSpacerHeight > 0 ? (
            <tr aria-hidden="true">
              <td
                colSpan={Math.max(headerRow.length, 1)}
                style={{ height: topSpacerHeight, padding: 0, border: "none" }}
              />
            </tr>
          ) : null}

          {bodyRows.slice(visibleStart, visibleEnd).map((row, index) => {
            const rowIndex = visibleStart + index + bodyRowOffset;

            return (
              <tr key={rowIndex} style={{ height: EXCEL_VIEWER_ROW_HEIGHT }}>
                {row.map((value, colIndex) => renderCell(rowIndex, colIndex, value, false))}
              </tr>
            );
          })}

          {bottomSpacerHeight > 0 ? (
            <tr aria-hidden="true">
              <td
                colSpan={Math.max(headerRow.length, 1)}
                style={{ height: bottomSpacerHeight, padding: 0, border: "none" }}
              />
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

export function ExcelPriceViewer({
  open,
  onClose,
  downloadUrl,
  filename,
  mimeType,
}: ExcelPriceViewerProps) {
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  const openRef = useRef(open);
  const historyActiveRef = useRef(false);
  const ignoreNextPopStateRef = useRef(false);
  const fileBlobRef = useRef<Blob | null>(null);

  const [isMounted, setIsMounted] = useState(false);
  const [phase, setPhase] = useState<ViewerPhase>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [parseProgress, setParseProgress] = useState("");
  const [workbook, setWorkbook] = useState<WorkbookData | null>(null);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const [isSharing, setIsSharing] = useState(false);
  const [shareError, setShareError] = useState("");

  onCloseRef.current = onClose;
  openRef.current = open;

  const activeSheet = workbook?.sheets[activeSheetIndex] ?? null;

  const matches = useMemo(() => {
    if (!activeSheet || !searchQuery.trim()) {
      return [];
    }

    return searchWorksheet(activeSheet.rows, searchQuery);
  }, [activeSheet, searchQuery]);

  const resetState = useCallback(() => {
    fileBlobRef.current = null;
    setPhase("loading");
    setErrorMessage("");
    setParseProgress("");
    setWorkbook(null);
    setActiveSheetIndex(0);
    setSearchQuery("");
    setActiveMatchIndex(0);
    setIsSharing(false);
    setShareError("");
  }, []);

  const closeViewer = useCallback(() => {
    if (!openRef.current) {
      return;
    }

    openRef.current = false;
    onCloseRef.current();
  }, []);

  const handleClose = useCallback(() => {
    closeViewer();

    if (historyActiveRef.current) {
      historyActiveRef.current = false;
      ignoreNextPopStateRef.current = true;
      window.history.back();
    }
  }, [closeViewer]);

  const ensureFileBlob = useCallback(async (): Promise<Blob> => {
    if (fileBlobRef.current) {
      return fileBlobRef.current;
    }

    const blob = await fetchAuthenticatedFileBlob(downloadUrl);
    fileBlobRef.current = blob;
    return blob;
  }, [downloadUrl]);

  const handleDownload = useCallback(async () => {
    try {
      const blob = await ensureFileBlob();
      downloadFileBlob(blob, filename);
    } catch (error) {
      console.error("Excel viewer download error:", error);
      setShareError("Не вдалося завантажити файл.");
    }
  }, [ensureFileBlob, filename]);

  const handleShare = useCallback(async () => {
    setShareError("");
    setIsSharing(true);

    try {
      const blob = await ensureFileBlob();
      await shareAuthenticatedFile({ blob, filename, mimeType });
    } catch (error) {
      console.error("Excel viewer share error:", error);
      setShareError("Не вдалося поділитися файлом.");
    } finally {
      setIsSharing(false);
    }
  }, [ensureFileBlob, filename, mimeType]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      document.body.style.overflow = "";
      historyActiveRef.current = false;
      resetState();
      return;
    }

    document.body.style.overflow = "hidden";

    if (!historyActiveRef.current) {
      window.history.pushState({ nextlevelExcelViewer: true }, "");
      historyActiveRef.current = true;
    }

    function handlePopState() {
      if (ignoreNextPopStateRef.current) {
        ignoreNextPopStateRef.current = false;
        return;
      }

      if (!historyActiveRef.current || !openRef.current) {
        return;
      }

      historyActiveRef.current = false;
      closeViewer();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        handleClose();
      }
    }

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, closeViewer, handleClose, resetState]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    async function loadWorkbook() {
      resetState();
      setPhase("loading");

      try {
        const blob = await fetchAuthenticatedFileBlob(downloadUrl, controller.signal);
        fileBlobRef.current = blob;

        if (cancelled) {
          return;
        }

        setPhase("parsing");
        const buffer = await blob.arrayBuffer();
        const parsedWorkbook = await parseExcelWorkbook(buffer, (progress) => {
          if (cancelled) {
            return;
          }

          if (progress.phase === "parsing" && progress.sheetCount > 0) {
            setParseProgress(
              `Обробка аркуша ${progress.sheetIndex} з ${progress.sheetCount}…`,
            );
          }
        });

        if (cancelled) {
          return;
        }

        if (isWorkbookTooLarge(parsedWorkbook)) {
          setPhase("too-large");
          return;
        }

        setWorkbook(parsedWorkbook);
        setActiveSheetIndex(parsedWorkbook.defaultSheetIndex);
        setPhase("ready");
      } catch (error) {
        if (cancelled || (error instanceof DOMException && error.name === "AbortError")) {
          return;
        }

        console.error("Excel viewer load error:", error);
        setErrorMessage(error instanceof Error ? error.message : "Unknown error");
        setPhase("error");
      }
    }

    void loadWorkbook();

    return () => {
      cancelled = true;
      controller.abort();
      fileBlobRef.current = null;
    };
  }, [downloadUrl, open, resetState]);

  useEffect(() => {
    setActiveMatchIndex(0);
  }, [searchQuery, activeSheetIndex]);

  function handlePreviousMatch() {
    if (matches.length === 0) {
      return;
    }

    setActiveMatchIndex((current) => (current - 1 + matches.length) % matches.length);
  }

  function handleNextMatch() {
    if (matches.length === 0) {
      return;
    }

    setActiveMatchIndex((current) => (current + 1) % matches.length);
  }

  if (!open || !isMounted) {
    return null;
  }

  const fallbackActions = (
    <div className="flex flex-wrap justify-center gap-2">
      <Button type="button" onClick={() => void handleDownload()}>
        <Download />
        Завантажити Excel
      </Button>
      <Button type="button" variant="outline" disabled={isSharing} onClick={() => void handleShare()}>
        <Share2 />
        {isSharing ? "Підготовка файлу..." : "Поділитися"}
      </Button>
      <Button type="button" variant="outline" onClick={handleClose}>
        ✕ Закрити
      </Button>
    </div>
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-background"
      style={{ height: "100dvh" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <header className="sticky top-0 z-20 shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90">
        <div className="space-y-3 px-[max(1rem,env(safe-area-inset-left))] pb-3 pt-[max(1rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))]">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p id={titleId} className="truncate text-sm font-medium">
                {filename}
              </p>
              {phase === "parsing" && parseProgress ? (
                <p className="text-xs text-muted-foreground">{parseProgress}</p>
              ) : null}
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={phase === "loading" || phase === "parsing" || isSharing}
                onClick={() => void handleShare()}
              >
                <Share2 className="size-4" />
                {isSharing ? "Підготовка..." : "Поділитися"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={phase === "loading" || phase === "parsing"}
                onClick={() => void handleDownload()}
              >
                <Download className="size-4" />
                Завантажити Excel
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleClose}>
                ✕ Закрити
              </Button>
            </div>
          </div>

          {phase === "ready" && workbook && workbook.sheets.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {workbook.sheets.map((sheet, index) => (
                <Button
                  key={`${sheet.name}-${index}`}
                  type="button"
                  size="sm"
                  variant={index === activeSheetIndex ? "default" : "outline"}
                  className="shrink-0"
                  onClick={() => setActiveSheetIndex(index)}
                >
                  {sheet.name}
                </Button>
              ))}
            </div>
          ) : null}

          {phase === "ready" && activeSheet ? (
            <div className="space-y-2">
              <Input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Пошук у прайсі"
                aria-label="Пошук у прайсі"
              />
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs text-muted-foreground">
                  {searchQuery.trim() ? `Знайдено: ${matches.length}` : "Знайдено: 0"}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={matches.length === 0}
                  onClick={handlePreviousMatch}
                >
                  Попередній
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={matches.length === 0}
                  onClick={handleNextMatch}
                >
                  Наступний
                </Button>
              </div>
            </div>
          ) : null}

          {shareError ? (
            <p role="alert" className="text-xs text-destructive">
              {shareError}
            </p>
          ) : null}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col px-[max(1rem,env(safe-area-inset-left))] pb-[max(1rem,env(safe-area-inset-bottom))] pr-[max(1rem,env(safe-area-inset-right))] pt-3">
        {phase === "loading" ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Завантаження прайсу...
          </div>
        ) : null}

        {phase === "parsing" ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            {parseProgress || "Завантаження прайсу..."}
          </div>
        ) : null}

        {phase === "error" ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <p className="text-sm text-destructive">Не вдалося відкрити прайс</p>
            {errorMessage ? (
              <p className="max-w-lg break-words text-xs text-muted-foreground">{errorMessage}</p>
            ) : null}
            {fallbackActions}
          </div>
        ) : null}

        {phase === "too-large" ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
            <p className="text-sm text-muted-foreground">
              Файл завеликий для перегляду в браузері.
            </p>
            {fallbackActions}
          </div>
        ) : null}

        {phase === "ready" && activeSheet ? (
          <VirtualizedWorksheetTable
            worksheet={activeSheet}
            activeMatchIndex={activeMatchIndex}
            matches={matches}
          />
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
