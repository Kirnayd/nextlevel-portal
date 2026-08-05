import { DOCUMENTS_MIME_TYPE_LABELS } from "@/features/documents/constants";

export { buildContentDisposition } from "@/shared/lib/content-disposition";

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatUploadedAt(value: string): string {
  return new Intl.DateTimeFormat("uk-UA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function getMimeTypeLabel(mimeType: string): string {
  return (
    DOCUMENTS_MIME_TYPE_LABELS[mimeType as keyof typeof DOCUMENTS_MIME_TYPE_LABELS] ??
    mimeType
  );
}

export function formatSubcategoryHeading(name: string, documentCount: number): string {
  return `${name} (${documentCount})`;
}
