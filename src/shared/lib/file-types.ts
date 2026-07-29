export function isPdfMimeType(mimeType: string): boolean {
  return mimeType === "application/pdf";
}

const OFFICE_MIME_TYPES = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

export function isOfficeMimeType(mimeType: string): boolean {
  return OFFICE_MIME_TYPES.has(mimeType);
}

export function canPreviewInline(mimeType: string): boolean {
  return isPdfMimeType(mimeType);
}

export function formatFileSize(bytes: number | null | undefined): string | null {
  if (bytes == null || Number.isNaN(bytes)) {
    return null;
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
