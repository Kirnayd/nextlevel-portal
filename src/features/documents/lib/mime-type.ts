import {
  DOCUMENTS_ALLOWED_EXTENSIONS,
  DOCUMENTS_ALLOWED_MIME_TYPES,
  type DocumentsAllowedMimeType,
} from "@/features/documents/constants";

const EXTENSION_MIME_MAP: Record<string, DocumentsAllowedMimeType> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

function getFileExtension(filename: string): string {
  const trimmed = filename.trim();
  const lastDot = trimmed.lastIndexOf(".");

  if (lastDot <= 0) {
    return "";
  }

  return trimmed.slice(lastDot).toLowerCase();
}

function isAllowedMimeType(mimeType: string): mimeType is DocumentsAllowedMimeType {
  return (DOCUMENTS_ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType);
}

function isTrustedReportedMimeType(reportedType: string): boolean {
  return reportedType.length > 0 && reportedType !== "application/octet-stream";
}

export function resolveDocumentMimeType(
  filename: string,
  reportedType: string,
): DocumentsAllowedMimeType | null {
  if (isTrustedReportedMimeType(reportedType) && isAllowedMimeType(reportedType)) {
    return reportedType;
  }

  const extension = getFileExtension(filename);
  const mimeFromExtension = EXTENSION_MIME_MAP[extension];

  if (mimeFromExtension) {
    return mimeFromExtension;
  }

  return null;
}

export function isAllowedDocumentExtension(filename: string): boolean {
  const extension = getFileExtension(filename);

  return (DOCUMENTS_ALLOWED_EXTENSIONS as readonly string[]).includes(extension);
}

export function resolveOriginalFilename(file: File, formData: FormData): string {
  const submittedFilename = String(formData.get("original_filename") ?? "").trim();

  if (submittedFilename) {
    return submittedFilename;
  }

  return file.name.trim();
}
