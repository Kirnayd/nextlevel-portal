import { randomUUID } from "crypto";

import {
  DOCUMENTS_ALLOWED_EXTENSIONS,
  DOCUMENTS_STORAGE_PREFIX,
} from "@/features/documents/constants";

function getAllowedExtension(originalFilename: string): string | null {
  const trimmed = originalFilename.trim();
  const lastDot = trimmed.lastIndexOf(".");

  if (lastDot <= 0) {
    return null;
  }

  const extension = trimmed.slice(lastDot).toLowerCase();

  if (!(DOCUMENTS_ALLOWED_EXTENSIONS as readonly string[]).includes(extension)) {
    return null;
  }

  return extension;
}

export function buildDocumentStoragePath(
  categoryId: string,
  originalFilename: string,
): string {
  const extension = getAllowedExtension(originalFilename);

  if (!extension) {
    return `${DOCUMENTS_STORAGE_PREFIX}/${categoryId}/${randomUUID()}`;
  }

  return `${DOCUMENTS_STORAGE_PREFIX}/${categoryId}/${randomUUID()}${extension}`;
}
