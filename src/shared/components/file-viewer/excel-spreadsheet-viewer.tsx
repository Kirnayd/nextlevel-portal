"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type UIEvent,
} from "react";

import {
  EXCEL_VIEWER_OVERSCAN,
  EXCEL_VIEWER_ROW_HEIGHT,
} from "@/shared/lib/file-preview";
import {
  buildMergeMaps,
  isWorkbookTooLarge,
  parseExcelWorkbook,
  searchWorksheet,
  type SearchMatch,
  type WorkbookData,
  type WorksheetData,
} from "@/shared/lib/parse-excel-workbook";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/lib/utils";

export type ExcelSpreadsheetViewerProps = {
  fileBlob: Blob;
  searchPlaceholder?: string;
  loadingLabel?: string;
  onStatusChange?: (status: {
    phase: "loading" | "parsing" | "ready" | "too-large" | "error";
    message?: string;
  }) => void;
  onLoadError?: (message: string) => void;
};

function VirtualizedWorksheetTable({
  worksheet,
  activeMatchIndex,
  matches,
}: {
  worksheet: WorksheetData;
  activeMatchIndex: number;
  matches: SearchMatch[];
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

  return (
    <div
      ref={scrollRef}
      className="min-h-0 flex-1 overflow-auto rounded-md border bg-background"
      onScroll={(event: UIEvent<HTMLDivElement>) => setScrollTop(event.currentTarget.scrollTop)}
    >
      <table className="min-w-max border-collapse">
        <thead>
          <tr>{headerRow.map((value, colIndex) => renderCell(0, colIndex, value, true))}</tr>
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

export function ExcelSpreadsheetViewer({
  fileBlob,
  searchPlaceholder = "Пошук у таблиці",
  loadingLabel = "Завантаження...",
  onStatusChange,
  onLoadError,
}: ExcelSpreadsheetViewerProps) {
  const [phase, setPhase] = useState<"loading" | "parsing" | "ready" | "too-large" | "error">(
    "loading",
  );
  const [parseProgress, setParseProgress] = useState("");
  const [workbook, setWorkbook] = useState<WorkbookData | null>(null);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);

  const activeSheet = workbook?.sheets[activeSheetIndex] ?? null;

  const matches = useMemo(() => {
    if (!activeSheet || !searchQuery.trim()) {
      return [];
    }

    return searchWorksheet(activeSheet.rows, searchQuery);
  }, [activeSheet, searchQuery]);

  useEffect(() => {
    onStatusChange?.({ phase, message: parseProgress || undefined });
  }, [onStatusChange, phase, parseProgress]);

  useEffect(() => {
    let cancelled = false;

    async function parseWorkbook() {
      setPhase("parsing");
      setParseProgress("");

      try {
        const buffer = await fileBlob.arrayBuffer();
        const parsedWorkbook = await parseExcelWorkbook(buffer, (progress) => {
          if (cancelled) {
            return;
          }

          if (progress.phase === "parsing" && progress.sheetCount > 0) {
            setParseProgress(`Обробка аркуша ${progress.sheetIndex} з ${progress.sheetCount}…`);
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
        if (cancelled) {
          return;
        }

        const message = error instanceof Error ? error.message : "Unknown parse error";
        console.error("Excel parse error:", message);
        onLoadError?.(message);
        setPhase("error");
      }
    }

    void parseWorkbook();

    return () => {
      cancelled = true;
      setWorkbook(null);
      setSearchQuery("");
      setActiveMatchIndex(0);
    };
  }, [fileBlob, onLoadError]);

  useEffect(() => {
    setActiveMatchIndex(0);
  }, [searchQuery, activeSheetIndex]);

  if (phase === "loading" || phase === "parsing") {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        {parseProgress || loadingLabel}
      </div>
    );
  }

  if (phase === "too-large") {
    return (
      <div className="flex flex-1 items-center justify-center px-4 text-center text-sm text-muted-foreground">
        Файл завеликий для перегляду в браузері.
      </div>
    );
  }

  if (phase === "error" || !activeSheet) {
    return null;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {workbook && workbook.sheets.length > 1 ? (
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

      <div className="space-y-2">
        <Input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
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
            onClick={() =>
              setActiveMatchIndex((current) =>
                matches.length === 0 ? 0 : (current - 1 + matches.length) % matches.length,
              )
            }
          >
            Попередній
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={matches.length === 0}
            onClick={() =>
              setActiveMatchIndex((current) =>
                matches.length === 0 ? 0 : (current + 1) % matches.length,
              )
            }
          >
            Наступний
          </Button>
        </div>
      </div>

      <VirtualizedWorksheetTable
        worksheet={activeSheet}
        activeMatchIndex={activeMatchIndex}
        matches={matches}
      />
    </div>
  );
}
