export const EXCEL_VIEWER_MAX_ROWS = 5000;
export const EXCEL_VIEWER_MAX_COLS = 200;
export const EXCEL_VIEWER_MAX_CELLS = 200_000;
export const EXCEL_VIEWER_ROW_HEIGHT = 32;
export const EXCEL_VIEWER_OVERSCAN = 12;

export type FilePreviewMode =
  | "pdf"
  | "excel"
  | "docx"
  | "doc-fallback"
  | "pptx"
  | "ppt-fallback"
  | "unsupported";

export function getFilePreviewMode(mimeType: string): FilePreviewMode {
  switch (mimeType) {
    case "application/pdf":
      return "pdf";
    case "application/vnd.ms-excel":
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return "excel";
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return "docx";
    case "application/msword":
      return "doc-fallback";
    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      return "pptx";
    case "application/vnd.ms-powerpoint":
      return "ppt-fallback";
    default:
      return "unsupported";
  }
}

export function canOpenInViewer(mimeType: string): boolean {
  const mode = getFilePreviewMode(mimeType);
  return mode !== "unsupported";
}

export function getPreviewFallbackMessage(mode: FilePreviewMode): string {
  switch (mode) {
    case "doc-fallback":
      return "Попередній перегляд формату DOC недоступний.";
    case "ppt-fallback":
    case "pptx":
      return "Попередній перегляд презентації недоступний.";
    default:
      return "Попередній перегляд цього формату недоступний.";
  }
}

export function getDownloadLabel(mimeType: string): string {
  const mode = getFilePreviewMode(mimeType);

  switch (mode) {
    case "excel":
      return "Завантажити Excel";
    case "pdf":
      return "Завантажити PDF";
    default:
      return "Завантажити";
  }
}
