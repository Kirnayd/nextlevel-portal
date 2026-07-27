import { DOCUMENTS_MIME_TYPE_LABELS } from "@/features/documents/constants";

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

export function buildContentDisposition(
  originalFilename: string,
  disposition: "inline" | "attachment",
): string {
  const encodedFilename = encodeURIComponent(originalFilename);
  const lastDot = originalFilename.lastIndexOf(".");
  const extension = lastDot > 0 ? originalFilename.slice(lastDot).toLowerCase() : "";
  const safeBase =
    (lastDot > 0 ? originalFilename.slice(0, lastDot) : originalFilename)
      .replace(/[^\x20-\x7E]/g, "_")
      .replace(/["\\]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^[_\-.]+|[_\-.]+$/g, "") || "document";
  const safeFilename = `${safeBase}${extension}`;

  return `${disposition}; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`;
}
