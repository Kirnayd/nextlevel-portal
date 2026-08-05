"use server";

import { revalidatePath } from "next/cache";

import {
  PRICE_ALLOWED_MIME_TYPES,
  PRICE_CATEGORY,
  PRICE_MAX_SIZE_BYTES,
  PRICE_STORAGE_BUCKET,
  PRICE_STORAGE_PREFIX,
} from "@/features/price/constants";
import { notifyPriceUpdated } from "@/infrastructure/push/triggers";
import { createAdminClient } from "@/infrastructure/supabase/admin";
import { createClient } from "@/infrastructure/supabase/server";
import { getAuthenticatedUser, isAdmin } from "@/shared/lib/auth";
import type { Tables, TablesInsert, TablesUpdate } from "@/shared/types/database.types";

export type PriceFile = Tables<"files">;

export type UploadPriceResult =
  | { success: true; pushWarning?: string }
  | { success: false; error: string };

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^\w.\-() ]+/g, "_").trim() || "price-file";
}

function buildStoragePath(filename: string): string {
  const safeName = sanitizeFilename(filename);
  return `${PRICE_STORAGE_PREFIX}/${Date.now()}-${safeName}`;
}

function isAllowedMimeType(mimeType: string): mimeType is (typeof PRICE_ALLOWED_MIME_TYPES)[number] {
  return (PRICE_ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType);
}

export async function getCurrentPriceFile(): Promise<PriceFile | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("files")
    .select(
      "id, storage_path, original_filename, mime_type, size_bytes, updated_at, category, created_at, uploaded_by",
    )
    .eq("category", PRICE_CATEGORY)
    .maybeSingle();

  if (error) {
    console.error("Failed to load price file:", error.message);
    return null;
  }

  return data as PriceFile | null;
}

export async function uploadPriceFile(formData: FormData): Promise<UploadPriceResult> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: "Увійдіть у систему, щоб завантажити файл." };
  }

  if (!(await isAdmin(user.id))) {
    return { success: false, error: "Лише адміністратор може завантажувати прайс." };
  }

  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "Оберіть файл Excel або PDF." };
  }

  if (file.size > PRICE_MAX_SIZE_BYTES) {
    return { success: false, error: "Файл перевищує максимальний розмір 25 МБ." };
  }

  if (!isAllowedMimeType(file.type)) {
    return { success: false, error: "Дозволені лише файли Excel (.xls, .xlsx) або PDF." };
  }

  const supabase = await createClient();
  const existingPrice = await getCurrentPriceFile();
  const storagePath = buildStoragePath(file.name);
  const fileBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(PRICE_STORAGE_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("Failed to upload price file:", uploadError.message);
    return { success: false, error: "Не вдалося зберегти файл. Спробуйте ще раз." };
  }

  const insertPayload: TablesInsert<"files"> = {
    category: PRICE_CATEGORY,
    storage_path: storagePath,
    original_filename: file.name,
    mime_type: file.type,
    size_bytes: file.size,
    uploaded_by: user.id,
  };

  const updatePayload: TablesUpdate<"files"> = {
    storage_path: storagePath,
    original_filename: file.name,
    mime_type: file.type,
    size_bytes: file.size,
    uploaded_by: user.id,
    updated_at: new Date().toISOString(),
  };

  if (existingPrice) {
    const { error: updateError } = await supabase
      .from("files")
      .update(updatePayload as never)
      .eq("id", existingPrice.id);

    if (updateError) {
      await supabase.storage.from(PRICE_STORAGE_BUCKET).remove([storagePath]);
      console.error("Failed to update price metadata:", updateError.message);
      return { success: false, error: "Не вдалося оновити метадані файлу." };
    }

    if (existingPrice.storage_path) {
      const { error: removeError } = await supabase.storage
        .from(PRICE_STORAGE_BUCKET)
        .remove([existingPrice.storage_path]);

      if (removeError) {
        console.error("Failed to remove previous price storage object:", removeError.message);
      }
    }
  } else {
    const { error: insertError } = await supabase
      .from("files")
      .insert(insertPayload as never);

    if (insertError) {
      await supabase.storage.from(PRICE_STORAGE_BUCKET).remove([storagePath]);
      console.error("Failed to save price metadata:", insertError.message);
      return { success: false, error: "Не вдалося зберегти метадані файлу." };
    }
  }

  revalidatePath("/price");
  revalidatePath("/dashboard");

  const admin = createAdminClient();
  const { error: clearReadsError } = await admin.from("price_reads").delete().not("id", "is", null);

  if (clearReadsError) {
    console.error("Failed to clear price reads after upload:", clearReadsError.message);
  }

  let pushWarning: string | undefined;

  try {
    const updatedPriceFile = await getCurrentPriceFile();

    if (updatedPriceFile) {
      pushWarning = await notifyPriceUpdated(updatedPriceFile.id, updatedPriceFile.updated_at);
    }
  } catch (error) {
    console.error("Price push notification failed:", error);
  }

  return { success: true, pushWarning };
}
