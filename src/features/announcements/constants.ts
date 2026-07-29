export const ANNOUNCEMENT_TITLE_MAX_LENGTH = 200;
export const ANNOUNCEMENT_CONTENT_MAX_LENGTH = 10000;

export const ANNOUNCEMENT_IMAGES_STORAGE_BUCKET = "portal-files";
export const ANNOUNCEMENT_IMAGES_STORAGE_PREFIX = "announcements";

export const ANNOUNCEMENT_MAX_IMAGES = 10;
export const ANNOUNCEMENT_IMAGE_MAX_SIZE_BYTES = 10 * 1024 * 1024;
export const ANNOUNCEMENTS_LIST_LIMIT = 100;

export const ANNOUNCEMENT_ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AnnouncementAllowedImageMimeType =
  (typeof ANNOUNCEMENT_ALLOWED_IMAGE_MIME_TYPES)[number];

export const ANNOUNCEMENT_ALLOWED_IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
] as const;

export function getAnnouncementImageUrl(imageId: string): string {
  return `/api/announcements/images?id=${imageId}`;
}
