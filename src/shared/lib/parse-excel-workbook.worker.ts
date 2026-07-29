/// <reference lib="webworker" />

import type { ParseProgress, WorkbookData } from "@/shared/lib/parse-excel-workbook";

type WorkerRequest = {
  buffer: ArrayBuffer;
};

type WorkerResponse =
  | { workbook: WorkbookData }
  | { error: string };

declare const self: DedicatedWorkerGlobalScope;

function formatCellValue(cell: import("xlsx").CellObject | undefined): string {
  if (!cell) {
    return "";
  }

  if (cell.w != null && cell.w !== "") {
    return String(cell.w);
  }

  if (cell.v == null) {
    return "";
  }

  if (cell.t === "d" && cell.v instanceof Date) {
    return cell.v.toLocaleString("uk-UA");
  }

  if (cell.t === "b") {
    return cell.v ? "TRUE" : "FALSE";
  }

  return String(cell.v);
}

function getDefaultSheetIndex(
  sheetNames: string[],
  workbookMeta: import("xlsx").WorkBook["Workbook"],
): number {
  const metaSheets = workbookMeta?.Sheets ?? [];

  for (let index = 0; index < sheetNames.length; index += 1) {
    const hidden = metaSheets[index]?.Hidden;

    if (hidden !== 1 && hidden !== 2) {
      return index;
    }
  }

  return 0;
}

function parseWorksheet(
  sheet: import("xlsx").WorkSheet,
  sheetName: string,
  xlsxModule: typeof import("xlsx"),
): WorkbookData["sheets"][number] {
  const ref = sheet["!ref"];

  if (!ref) {
    return {
      name: sheetName,
      rows: [],
      merges: [],
      rowCount: 0,
      colCount: 0,
    };
  }

  const range = xlsxModule.utils.decode_range(ref);
  const rowCount = range.e.r - range.s.r + 1;
  const colCount = range.e.c - range.s.c + 1;
  const rows = Array.from({ length: rowCount }, () => Array.from({ length: colCount }, () => ""));

  for (let rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex += 1) {
    for (let colIndex = range.s.c; colIndex <= range.e.c; colIndex += 1) {
      const address = xlsxModule.utils.encode_cell({ r: rowIndex, c: colIndex });
      const cell = sheet[address];
      rows[rowIndex - range.s.r][colIndex - range.s.c] = formatCellValue(cell);
    }
  }

  const merges = (sheet["!merges"] ?? []).map((merge) => ({
    row: merge.s.r - range.s.r,
    col: merge.s.c - range.s.c,
    rowSpan: merge.e.r - merge.s.r + 1,
    colSpan: merge.e.c - merge.s.c + 1,
  }));

  return {
    name: sheetName,
    rows,
    merges,
    rowCount,
    colCount,
  };
}

async function parseBuffer(buffer: ArrayBuffer): Promise<WorkbookData> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: true,
    cellNF: true,
    cellText: true,
    dense: false,
  });

  const sheetNames = workbook.SheetNames;
  const sheets: WorkbookData["sheets"] = [];

  for (let index = 0; index < sheetNames.length; index += 1) {
    const sheetName = sheetNames[index];
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
      continue;
    }

    sheets.push(parseWorksheet(worksheet, sheetName, XLSX));
  }

  return {
    sheets,
    defaultSheetIndex: getDefaultSheetIndex(sheetNames, workbook.Workbook),
  };
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  void (async () => {
    try {
      const workbook = await parseBuffer(event.data.buffer);
      const response: WorkerResponse = { workbook };
      self.postMessage(response);
    } catch (error) {
      const response: WorkerResponse = {
        error: error instanceof Error ? error.message : "Excel worker failed",
      };
      self.postMessage(response);
    }
  })();
};

export type { ParseProgress };
