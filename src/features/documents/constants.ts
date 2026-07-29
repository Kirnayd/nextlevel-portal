import { MAX_ATTACHMENT_SIZE_BYTES } from "@/shared/lib/constants";

export const DOCUMENTS_STORAGE_BUCKET = "portal-files";
export const DOCUMENTS_STORAGE_PREFIX = "documents";

export const DOCUMENTS_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
] as const;

export type DocumentsAllowedMimeType = (typeof DOCUMENTS_ALLOWED_MIME_TYPES)[number];

export const DOCUMENTS_ALLOWED_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
] as const;

export const DOCUMENTS_MAX_SIZE_BYTES = MAX_ATTACHMENT_SIZE_BYTES;

export const DOCUMENTS_MIME_TYPE_LABELS: Record<DocumentsAllowedMimeType, string> = {
  "application/pdf": "PDF",
  "application/msword": "DOC",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "application/vnd.ms-excel": "XLS",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
  "application/vnd.ms-powerpoint": "PPT",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX",
};

export const CATEGORY_NAME_MAX_LENGTH = 120;
export const SUBCATEGORY_NAME_MAX_LENGTH = 120;
export const DOCUMENT_TITLE_MAX_LENGTH = 200;
export const UNCATEGORIZED_SUBCATEGORY_LABEL = "Без підкатегорії";

export const HIDE_EMPTY_CATEGORIES_STORAGE_KEY = "documents-hide-empty-categories";
