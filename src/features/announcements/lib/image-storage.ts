import { randomUUID } from "crypto";

import {
  ANNOUNCEMENT_ALLOWED_IMAGE_EXTENSIONS,
  ANNOUNCEMENT_IMAGES_STORAGE_PREFIX,
  type AnnouncementAllowedImageMimeType,
} from "@/features/announcements/constants";

const MIME_EXTENSION_MAP: Record<AnnouncementAllowedImageMimeType, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export function buildAnnouncementImageStoragePath(
  announcementId: string,
  mimeType: AnnouncementAllowedImageMimeType,
): string {
  const extension = MIME_EXTENSION_MAP[mimeType];
  return `${ANNOUNCEMENT_IMAGES_STORAGE_PREFIX}/${announcementId}/${randomUUID()}${extension}`;
}

export function isAllowedAnnouncementImageMimeType(
  mimeType: string,
): mimeType is AnnouncementAllowedImageMimeType {
  return mimeType in MIME_EXTENSION_MAP;
}

export function resolveAnnouncementImageMimeType(
  mimeType: string,
  filename: string,
): AnnouncementAllowedImageMimeType | null {
  if (isAllowedAnnouncementImageMimeType(mimeType)) {
    return mimeType;
  }

  const extension = filename.trim().toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";

  if (!(ANNOUNCEMENT_ALLOWED_IMAGE_EXTENSIONS as readonly string[]).includes(extension)) {
    return null;
  }

  if (extension === ".jpg" || extension === ".jpeg") {
    return "image/jpeg";
  }

  if (extension === ".png") {
    return "image/png";
  }

  if (extension === ".webp") {
    return "image/webp";
  }

  return null;
}

export function sortAnnouncementImages<T extends { sort_order: number; created_at: string }>(
  images: T[],
): T[] {
  return [...images].sort((left, right) => {
    if (left.sort_order !== right.sort_order) {
      return left.sort_order - right.sort_order;
    }

    return left.created_at.localeCompare(right.created_at);
  });
}
