"use server";

import { revalidatePath } from "next/cache";

import {
  ANNOUNCEMENT_CONTENT_MAX_LENGTH,
  ANNOUNCEMENT_IMAGES_STORAGE_BUCKET,
  ANNOUNCEMENT_IMAGES_STORAGE_PREFIX,
  ANNOUNCEMENT_IMAGE_MAX_SIZE_BYTES,
  ANNOUNCEMENT_MAX_IMAGES,
  ANNOUNCEMENT_TITLE_MAX_LENGTH,
} from "@/features/announcements/constants";
import {
  buildAnnouncementImageStoragePath,
  resolveAnnouncementImageMimeType,
  sortAnnouncementImages,
} from "@/features/announcements/lib/image-storage";
import { formatSupabaseError, logSupabaseError } from "@/features/announcements/lib/supabase-error";
import { notifyAnnouncementPublished } from "@/infrastructure/push/triggers";
import { createClient } from "@/infrastructure/supabase/server";
import { getAuthenticatedUser, isAdmin } from "@/shared/lib/auth";
import type { Tables, TablesInsert, TablesUpdate } from "@/shared/types/database.types";

export type Announcement = Tables<"announcements">;
export type AnnouncementImage = Tables<"announcement_images">;

export type AnnouncementWithImages = Announcement & {
  images: AnnouncementImage[];
};

type ActionResult =
  | { success: true; pushWarning?: string }
  | { success: false; error: string };

async function runAnnouncementPublishedPush(
  announcementId: string,
  title: string,
): Promise<string | undefined> {
  try {
    return await notifyAnnouncementPublished(announcementId, title);
  } catch (error) {
    console.error("Announcement push notification failed:", error);
    return undefined;
  }
}

function parsePublishedFromForm(formData: FormData): boolean {
  return formData.get("is_published") === "on";
}

function parsePinnedFromForm(formData: FormData): boolean {
  return formData.get("is_pinned") === "on";
}

async function requireAdmin(): Promise<
  { user: NonNullable<Awaited<ReturnType<typeof getAuthenticatedUser>>> } | ActionResult
> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: "Увійдіть у систему." };
  }

  if (!(await isAdmin(user.id))) {
    return { success: false, error: "Лише адміністратор може виконати цю дію." };
  }

  return { user };
}

function validateAnnouncementInput(title: string, content: string): string | null {
  const trimmedTitle = title.trim();
  const trimmedContent = content.trim();

  if (!trimmedTitle) {
    return "Вкажіть заголовок оголошення.";
  }

  if (!trimmedContent) {
    return "Вкажіть текст оголошення.";
  }

  if (trimmedTitle.length > ANNOUNCEMENT_TITLE_MAX_LENGTH) {
    return `Заголовок не може перевищувати ${ANNOUNCEMENT_TITLE_MAX_LENGTH} символів.`;
  }

  if (trimmedContent.length > ANNOUNCEMENT_CONTENT_MAX_LENGTH) {
    return `Текст не може перевищувати ${ANNOUNCEMENT_CONTENT_MAX_LENGTH} символів.`;
  }

  return null;
}

export async function getAnnouncements(): Promise<AnnouncementWithImages[]> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("announcements")
    .select("*, announcement_images(*)")
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    logSupabaseError("Failed to load announcements", error);
    return [];
  }

  return ((data ?? []) as Array<Announcement & { announcement_images: AnnouncementImage[] | null }>).map(
    (row) => {
      const { announcement_images, ...announcement } = row;

      return {
        ...announcement,
        images: sortAnnouncementImages(announcement_images ?? []),
      };
    },
  );
}

export async function getAnnouncementImageById(imageId: string): Promise<AnnouncementImage | null> {
  const user = await getAuthenticatedUser();

  if (!user || !imageId) {
    return null;
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("announcement_images")
    .select("*")
    .eq("id", imageId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load announcement image:", error.message);
    return null;
  }

  return data as AnnouncementImage | null;
}

export async function createAnnouncement(formData: FormData): Promise<ActionResult> {
  const adminResult = await requireAdmin();

  if ("success" in adminResult) {
    return adminResult;
  }

  const { user } = adminResult;
  const title = String(formData.get("title") ?? "");
  const content = String(formData.get("content") ?? "");
  const validationError = validateAnnouncementInput(title, content);

  if (validationError) {
    return { success: false, error: validationError };
  }

  const insertPayload: TablesInsert<"announcements"> = {
    title: title.trim(),
    content: content.trim(),
    is_pinned: parsePinnedFromForm(formData),
    is_published: parsePublishedFromForm(formData),
    created_by: user.id,
  };

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("announcements")
    .insert(insertPayload as never)
    .select("*")
    .single();

  if (error) {
    const errorText = formatSupabaseError(error);
    logSupabaseError("Failed to create announcement", error);
    return { success: false, error: errorText };
  }

  if (!data) {
    return {
      success: false,
      error: "Оголошення не повернулось після створення. Перевірте RLS і created_by.",
    };
  }

  console.info("Announcement created:", (data as Announcement).id);

  revalidatePath("/announcements");

  let pushWarning: string | undefined;

  if (insertPayload.is_published) {
    pushWarning = await runAnnouncementPublishedPush(
      (data as Announcement).id,
      insertPayload.title,
    );
  }

  return { success: true, pushWarning };
}

export async function updateAnnouncement(
  announcementId: string,
  formData: FormData,
): Promise<ActionResult> {
  const adminResult = await requireAdmin();

  if ("success" in adminResult) {
    return adminResult;
  }

  if (!announcementId) {
    return { success: false, error: "Оголошення не знайдено." };
  }

  const title = String(formData.get("title") ?? "");
  const content = String(formData.get("content") ?? "");
  const validationError = validateAnnouncementInput(title, content);

  if (validationError) {
    return { success: false, error: validationError };
  }

  const updatePayload: TablesUpdate<"announcements"> = {
    title: title.trim(),
    content: content.trim(),
    is_pinned: parsePinnedFromForm(formData),
    is_published: parsePublishedFromForm(formData),
  };

  const supabase = await createClient();

  const { data: existingAnnouncement, error: existingError } = await supabase
    .from("announcements")
    .select("is_published")
    .eq("id", announcementId)
    .maybeSingle();

  if (existingError || !existingAnnouncement) {
    return { success: false, error: "Оголошення не знайдено." };
  }

  const { data, error } = await supabase
    .from("announcements")
    .update(updatePayload as never)
    .eq("id", announcementId)
    .select("*")
    .single();

  if (error) {
    const errorText = formatSupabaseError(error);
    logSupabaseError("Failed to update announcement", error);
    return { success: false, error: errorText };
  }

  if (!data) {
    return { success: false, error: "Оголошення не знайдено після оновлення." };
  }

  revalidatePath("/announcements");

  let pushWarning: string | undefined;
  const wasPublished = (existingAnnouncement as { is_published: boolean }).is_published;
  const isNowPublished = updatePayload.is_published ?? false;

  if (!wasPublished && isNowPublished) {
    pushWarning = await runAnnouncementPublishedPush(
      announcementId,
      updatePayload.title ?? "",
    );
  }

  return { success: true, pushWarning };
}

async function removeAnnouncementImagesFromStorage(storagePaths: string[]): Promise<void> {
  if (storagePaths.length === 0) {
    return;
  }

  const supabase = await createClient();

  const { error } = await supabase.storage
    .from(ANNOUNCEMENT_IMAGES_STORAGE_BUCKET)
    .remove(storagePaths);

  if (error) {
    console.error("Failed to remove announcement images from storage:", error.message);
  }
}

export async function deleteAnnouncement(announcementId: string): Promise<ActionResult> {
  const adminResult = await requireAdmin();

  if ("success" in adminResult) {
    return adminResult;
  }

  if (!announcementId) {
    return { success: false, error: "Оголошення не знайдено." };
  }

  const supabase = await createClient();

  const { data: images, error: imagesError } = await supabase
    .from("announcement_images")
    .select("storage_path")
    .eq("announcement_id", announcementId);

  if (imagesError) {
    console.error("Failed to load announcement images for deletion:", imagesError.message);
    return { success: false, error: "Не вдалося видалити оголошення." };
  }

  const { error } = await supabase.from("announcements").delete().eq("id", announcementId);

  if (error) {
    console.error("Failed to delete announcement:", error.message);
    return { success: false, error: "Не вдалося видалити оголошення." };
  }

  await removeAnnouncementImagesFromStorage(
    ((images ?? []) as Array<{ storage_path: string }>).map((image) => image.storage_path),
  );

  revalidatePath("/announcements");

  return { success: true };
}

export async function togglePinned(announcementId: string): Promise<ActionResult> {
  const adminResult = await requireAdmin();

  if ("success" in adminResult) {
    return adminResult;
  }

  if (!announcementId) {
    return { success: false, error: "Оголошення не знайдено." };
  }

  const supabase = await createClient();

  const { data, error: loadError } = await supabase
    .from("announcements")
    .select("is_pinned")
    .eq("id", announcementId)
    .maybeSingle();

  if (loadError || !data) {
    return { success: false, error: "Оголошення не знайдено." };
  }

  const current = data as { is_pinned: boolean };

  const { error } = await supabase
    .from("announcements")
    .update({ is_pinned: !current.is_pinned } as never)
    .eq("id", announcementId);

  if (error) {
    console.error("Failed to toggle pinned announcement:", error.message);
    return { success: false, error: "Не вдалося змінити закріплення." };
  }

  revalidatePath("/announcements");

  return { success: true };
}

export async function togglePublished(announcementId: string): Promise<ActionResult> {
  const adminResult = await requireAdmin();

  if ("success" in adminResult) {
    return adminResult;
  }

  if (!announcementId) {
    return { success: false, error: "Оголошення не знайдено." };
  }

  const supabase = await createClient();

  const { data, error: loadError } = await supabase
    .from("announcements")
    .select("is_published, title")
    .eq("id", announcementId)
    .maybeSingle();

  if (loadError || !data) {
    return { success: false, error: "Оголошення не знайдено." };
  }

  const current = data as { is_published: boolean; title: string };

  const { error } = await supabase
    .from("announcements")
    .update({ is_published: !current.is_published } as never)
    .eq("id", announcementId);

  if (error) {
    console.error("Failed to toggle published announcement:", error.message);
    return { success: false, error: "Не вдалося змінити статус публікації." };
  }

  revalidatePath("/announcements");

  let pushWarning: string | undefined;

  if (!current.is_published) {
    pushWarning = await runAnnouncementPublishedPush(announcementId, current.title);
  }

  return { success: true, pushWarning };
}

export async function uploadAnnouncementImage(
  announcementId: string,
  formData: FormData,
): Promise<ActionResult> {
  const adminResult = await requireAdmin();

  if ("success" in adminResult) {
    return adminResult;
  }

  if (!announcementId) {
    return { success: false, error: "Оголошення не знайдено." };
  }

  const file = formData.get("image");

  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "Оберіть зображення для завантаження." };
  }

  if (file.size > ANNOUNCEMENT_IMAGE_MAX_SIZE_BYTES) {
    return { success: false, error: "Зображення перевищує максимальний розмір 10 МБ." };
  }

  const mimeType = resolveAnnouncementImageMimeType(file.type, file.name);

  if (!mimeType) {
    return { success: false, error: "Дозволені лише зображення JPG, PNG або WEBP." };
  }

  const supabase = await createClient();

  const { data: announcement, error: announcementError } = await supabase
    .from("announcements")
    .select("id")
    .eq("id", announcementId)
    .maybeSingle();

  if (announcementError || !announcement) {
    if (announcementError) {
      const errorText = formatSupabaseError(announcementError);
      logSupabaseError("Failed to load announcement for image upload", announcementError);
      return { success: false, error: errorText };
    }

    return { success: false, error: "Оголошення не знайдено." };
  }

  const { count, error: countError } = await supabase
    .from("announcement_images")
    .select("id", { count: "exact", head: true })
    .eq("announcement_id", announcementId);

  if (countError) {
    const errorText = formatSupabaseError(countError);
    logSupabaseError("Failed to count announcement images", countError);
    return { success: false, error: errorText };
  }

  if ((count ?? 0) >= ANNOUNCEMENT_MAX_IMAGES) {
    return {
      success: false,
      error: `Максимальна кількість зображень для одного оголошення: ${ANNOUNCEMENT_MAX_IMAGES}.`,
    };
  }

  const storagePath = buildAnnouncementImageStoragePath(announcementId, mimeType);
  const fileBuffer = await file.arrayBuffer();

  console.info("Uploading announcement image:", {
    bucket: ANNOUNCEMENT_IMAGES_STORAGE_BUCKET,
    storagePath,
    mimeType,
    sizeBytes: fileBuffer.byteLength,
    pathStartsWithAnnouncements: storagePath.startsWith(`${ANNOUNCEMENT_IMAGES_STORAGE_PREFIX}/`),
  });

  const { error: uploadError } = await supabase.storage
    .from(ANNOUNCEMENT_IMAGES_STORAGE_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    const errorText = formatSupabaseError(uploadError);
    logSupabaseError("Storage upload failed for announcement image", uploadError);
    return { success: false, error: errorText };
  }

  const insertPayload: TablesInsert<"announcement_images"> = {
    announcement_id: announcementId,
    storage_path: storagePath,
    sort_order: count ?? 0,
  };

  const { error: insertError } = await supabase
    .from("announcement_images")
    .insert(insertPayload as never);

  if (insertError) {
    await supabase.storage.from(ANNOUNCEMENT_IMAGES_STORAGE_BUCKET).remove([storagePath]);
    const errorText = formatSupabaseError(insertError);
    logSupabaseError("Failed to insert announcement_images row", insertError);
    return { success: false, error: errorText };
  }

  revalidatePath("/announcements");

  return { success: true };
}

export async function deleteAnnouncementImage(imageId: string): Promise<ActionResult> {
  const adminResult = await requireAdmin();

  if ("success" in adminResult) {
    return adminResult;
  }

  if (!imageId) {
    return { success: false, error: "Зображення не знайдено." };
  }

  const supabase = await createClient();

  const { data: image, error: loadError } = await supabase
    .from("announcement_images")
    .select("storage_path, announcement_id")
    .eq("id", imageId)
    .maybeSingle();

  if (loadError || !image) {
    return { success: false, error: "Зображення не знайдено." };
  }

  const currentImage = image as { storage_path: string; announcement_id: string };

  const { error: deleteError } = await supabase
    .from("announcement_images")
    .delete()
    .eq("id", imageId);

  if (deleteError) {
    console.error("Failed to delete announcement image:", deleteError.message);
    return { success: false, error: "Не вдалося видалити зображення." };
  }

  await removeAnnouncementImagesFromStorage([currentImage.storage_path]);

  const { data: remainingImages, error: remainingError } = await supabase
    .from("announcement_images")
    .select("id")
    .eq("announcement_id", currentImage.announcement_id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (!remainingError) {
    const updates = ((remainingImages ?? []) as Array<{ id: string }>).map((item, index) =>
      supabase
        .from("announcement_images")
        .update({ sort_order: index } as never)
        .eq("id", item.id),
    );

    await Promise.all(updates);
  }

  revalidatePath("/announcements");

  return { success: true };
}

export async function reorderAnnouncementImages(
  announcementId: string,
  imageIds: string[],
): Promise<ActionResult> {
  const adminResult = await requireAdmin();

  if ("success" in adminResult) {
    return adminResult;
  }

  if (!announcementId || imageIds.length === 0) {
    return { success: false, error: "Немає зображень для сортування." };
  }

  const uniqueIds = new Set(imageIds);

  if (uniqueIds.size !== imageIds.length) {
    return { success: false, error: "Невірний порядок зображень." };
  }

  const supabase = await createClient();

  const { data: existingImages, error: loadError } = await supabase
    .from("announcement_images")
    .select("id")
    .eq("announcement_id", announcementId);

  if (loadError) {
    console.error("Failed to load announcement images for reorder:", loadError.message);
    return { success: false, error: "Не вдалося зберегти порядок зображень." };
  }

  const existingIds = new Set(((existingImages ?? []) as Array<{ id: string }>).map((item) => item.id));

  if (existingIds.size !== imageIds.length || imageIds.some((id) => !existingIds.has(id))) {
    return { success: false, error: "Невірний порядок зображень." };
  }

  const updates = imageIds.map((imageId, index) =>
    supabase
      .from("announcement_images")
      .update({ sort_order: index } as never)
      .eq("id", imageId),
  );

  const results = await Promise.all(updates);
  const failedUpdate = results.find((result) => result.error);

  if (failedUpdate?.error) {
    console.error("Failed to reorder announcement images:", failedUpdate.error.message);
    return { success: false, error: "Не вдалося зберегти порядок зображень." };
  }

  revalidatePath("/announcements");

  return { success: true };
}
