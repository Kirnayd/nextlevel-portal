import { MAX_ATTACHMENT_SIZE_BYTES } from "@/shared/lib/constants";

export const PRICE_STORAGE_BUCKET = "portal-files";
export const PRICE_STORAGE_PREFIX = "price";
export const PRICE_CATEGORY = "price" as const;

export const PRICE_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
] as const;

export type PriceAllowedMimeType = (typeof PRICE_ALLOWED_MIME_TYPES)[number];

export const PRICE_ALLOWED_EXTENSIONS = [".pdf", ".xlsx", ".xls"] as const;

export const PRICE_MAX_SIZE_BYTES = MAX_ATTACHMENT_SIZE_BYTES;

export const PRICE_MIME_TYPE_LABELS: Record<PriceAllowedMimeType, string> = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel",
  "application/vnd.ms-excel": "Excel",
};

export const EXCEL_VIEWER_MAX_ROWS = 5000;
export const EXCEL_VIEWER_MAX_COLS = 200;
export const EXCEL_VIEWER_MAX_CELLS = 200_000;
export const EXCEL_VIEWER_ROW_HEIGHT = 32;
export const EXCEL_VIEWER_OVERSCAN = 12;
