import type * as XLSX from "xlsx";

import {
  EXCEL_VIEWER_MAX_CELLS,
  EXCEL_VIEWER_MAX_COLS,
  EXCEL_VIEWER_MAX_ROWS,
} from "@/features/price/constants";

export type WorksheetMerge = {
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
};

export type WorksheetData = {
  name: string;
  rows: string[][];
  merges: WorksheetMerge[];
  rowCount: number;
  colCount: number;
};

export type WorkbookData = {
  sheets: WorksheetData[];
  defaultSheetIndex: number;
};

export type ParseProgress = {
  phase: "parsing" | "complete";
  sheetIndex: number;
  sheetCount: number;
};

function formatCellValue(cell: XLSX.CellObject | undefined): string {
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
  workbookMeta: XLSX.WorkBook["Workbook"],
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
  sheet: XLSX.WorkSheet,
  sheetName: string,
  xlsxModule: typeof import("xlsx"),
): WorksheetData {
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

  const merges: WorksheetMerge[] = (sheet["!merges"] ?? []).map((merge) => ({
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

export function isWorksheetTooLarge(rowCount: number, colCount: number): boolean {
  return (
    rowCount > EXCEL_VIEWER_MAX_ROWS ||
    colCount > EXCEL_VIEWER_MAX_COLS ||
    rowCount * colCount > EXCEL_VIEWER_MAX_CELLS
  );
}

export function isWorkbookTooLarge(workbook: WorkbookData): boolean {
  return workbook.sheets.some((sheet) => isWorksheetTooLarge(sheet.rowCount, sheet.colCount));
}

export async function parseExcelWorkbook(
  buffer: ArrayBuffer,
  onProgress?: (progress: ParseProgress) => void,
): Promise<WorkbookData> {
  const XLSX = await import("xlsx");

  onProgress?.({ phase: "parsing", sheetIndex: 0, sheetCount: 0 });

  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: true,
    cellNF: true,
    cellText: true,
    dense: false,
  });

  const sheetNames = workbook.SheetNames;
  const sheets: WorksheetData[] = [];

  for (let index = 0; index < sheetNames.length; index += 1) {
    onProgress?.({
      phase: "parsing",
      sheetIndex: index + 1,
      sheetCount: sheetNames.length,
    });

    const sheetName = sheetNames[index];
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
      continue;
    }

    sheets.push(parseWorksheet(worksheet, sheetName, XLSX));
  }

  onProgress?.({
    phase: "complete",
    sheetIndex: sheetNames.length,
    sheetCount: sheetNames.length,
  });

  return {
    sheets,
    defaultSheetIndex: getDefaultSheetIndex(sheetNames, workbook.Workbook),
  };
}

export function buildMergeMaps(merges: WorksheetMerge[]): {
  skipCells: Set<string>;
  spanCells: Map<string, WorksheetMerge>;
} {
  const skipCells = new Set<string>();
  const spanCells = new Map<string, WorksheetMerge>();

  for (const merge of merges) {
    const originKey = `${merge.row},${merge.col}`;
    spanCells.set(originKey, merge);

    for (let row = merge.row; row < merge.row + merge.rowSpan; row += 1) {
      for (let col = merge.col; col < merge.col + merge.colSpan; col += 1) {
        if (row === merge.row && col === merge.col) {
          continue;
        }

        skipCells.add(`${row},${col}`);
      }
    }
  }

  return { skipCells, spanCells };
}

export type SearchMatch = {
  row: number;
  col: number;
};

export function searchWorksheet(
  rows: string[][],
  query: string,
): SearchMatch[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("uk-UA");

  if (!normalizedQuery) {
    return [];
  }

  const matches: SearchMatch[] = [];

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];

    for (let colIndex = 0; colIndex < row.length; colIndex += 1) {
      const value = row[colIndex]?.toLocaleLowerCase("uk-UA") ?? "";

      if (value.includes(normalizedQuery)) {
        matches.push({ row: rowIndex, col: colIndex });
      }
    }
  }

  return matches;
}
