"use server";

import { revalidatePath } from "next/cache";

import {
  CATEGORY_NAME_MAX_LENGTH,
  DOCUMENTS_MAX_SIZE_BYTES,
  DOCUMENTS_STORAGE_BUCKET,
  DOCUMENT_TITLE_MAX_LENGTH,
} from "@/features/documents/constants";
import {
  isAllowedDocumentExtension,
  resolveDocumentMimeType,
  resolveOriginalFilename,
} from "@/features/documents/lib/mime-type";
import { buildDocumentStoragePath } from "@/features/documents/lib/storage-path";
import { createClient } from "@/infrastructure/supabase/server";
import { getAuthenticatedUser, isAdmin } from "@/shared/lib/auth";
import type { Tables, TablesInsert, TablesUpdate } from "@/shared/types/database.types";

export type DocumentCategory = Tables<"document_categories">;
export type Document = Tables<"documents">;

export type DocumentCategoryWithDocuments = DocumentCategory & {
  documents: Document[];
};

type ActionResult = { success: true } | { success: false; error: string };

function defaultTitleFromFilename(filename: string): string {
  const trimmed = filename.trim();
  const lastDot = trimmed.lastIndexOf(".");

  if (lastDot <= 0) {
    return trimmed || "Документ";
  }

  return trimmed.slice(0, lastDot);
}

function validateCategoryName(name: string): string | null {
  const trimmed = name.trim();

  if (!trimmed) {
    return "Вкажіть назву категорії.";
  }

  if (trimmed.length > CATEGORY_NAME_MAX_LENGTH) {
    return `Назва категорії не може перевищувати ${CATEGORY_NAME_MAX_LENGTH} символів.`;
  }

  return null;
}

function validateDocumentTitle(title: string): string | null {
  const trimmed = title.trim();

  if (!trimmed) {
    return "Вкажіть назву документа.";
  }

  if (trimmed.length > DOCUMENT_TITLE_MAX_LENGTH) {
    return `Назва документа не може перевищувати ${DOCUMENT_TITLE_MAX_LENGTH} символів.`;
  }

  return null;
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

export async function getDocumentCategoriesWithDocuments(): Promise<DocumentCategoryWithDocuments[]> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return [];
  }

  const supabase = await createClient();

  const [
    { data: categories, error: categoriesError },
    { data: documents, error: documentsError },
  ] = await Promise.all([
    supabase
      .from("document_categories")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase.from("documents").select("*").order("created_at", { ascending: false }),
  ]);

  if (categoriesError) {
    console.error("Failed to load document categories:", categoriesError.message);
    return [];
  }

  if (documentsError) {
    console.error("Failed to load documents:", documentsError.message);
    return [];
  }

  const documentsByCategory = new Map<string, Document[]>();

  for (const document of (documents ?? []) as Document[]) {
    const existing = documentsByCategory.get(document.category_id) ?? [];
    existing.push(document);
    documentsByCategory.set(document.category_id, existing);
  }

  return ((categories ?? []) as DocumentCategory[]).map((category) => ({
    ...category,
    documents: documentsByCategory.get(category.id) ?? [],
  }));
}

export async function createCategory(formData: FormData): Promise<ActionResult> {
  const adminResult = await requireAdmin();

  if ("success" in adminResult) {
    return adminResult;
  }

  const name = String(formData.get("name") ?? "");
  const validationError = validateCategoryName(name);

  if (validationError) {
    return { success: false, error: validationError };
  }

  const supabase = await createClient();

  const { data: lastCategoryData, error: sortError } = await supabase
    .from("document_categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (sortError) {
    console.error("Failed to resolve category sort order:", sortError.message);
    return { success: false, error: "Не вдалося створити категорію." };
  }

  const lastCategory = lastCategoryData as { sort_order: number } | null;

  const insertPayload: TablesInsert<"document_categories"> = {
    name: name.trim(),
    sort_order: (lastCategory?.sort_order ?? -1) + 1,
  };

  const { error } = await supabase
    .from("document_categories")
    .insert(insertPayload as never);

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Категорія з такою назвою вже існує." };
    }

    console.error("Failed to create category:", error.message);
    return { success: false, error: "Не вдалося створити категорію." };
  }

  revalidatePath("/documents");

  return { success: true };
}

export async function renameCategory(categoryId: string, formData: FormData): Promise<ActionResult> {
  const adminResult = await requireAdmin();

  if ("success" in adminResult) {
    return adminResult;
  }

  if (!categoryId) {
    return { success: false, error: "Категорію не знайдено." };
  }

  const name = String(formData.get("name") ?? "");
  const validationError = validateCategoryName(name);

  if (validationError) {
    return { success: false, error: validationError };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("document_categories")
    .update({ name: name.trim() } as never)
    .eq("id", categoryId);

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Категорія з такою назвою вже існує." };
    }

    console.error("Failed to rename category:", error.message);
    return { success: false, error: "Не вдалося перейменувати категорію." };
  }

  revalidatePath("/documents");

  return { success: true };
}

export async function deleteCategory(categoryId: string): Promise<ActionResult> {
  const adminResult = await requireAdmin();

  if ("success" in adminResult) {
    return adminResult;
  }

  if (!categoryId) {
    return { success: false, error: "Категорію не знайдено." };
  }

  const supabase = await createClient();

  const { count, error: countError } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("category_id", categoryId);

  if (countError) {
    console.error("Failed to count category documents:", countError.message);
    return { success: false, error: "Не вдалося перевірити документи категорії." };
  }

  if ((count ?? 0) > 0) {
    return {
      success: false,
      error: "Неможливо видалити категорію, у якій є документи.",
    };
  }

  const { error } = await supabase.from("document_categories").delete().eq("id", categoryId);

  if (error) {
    console.error("Failed to delete category:", error.message);
    return { success: false, error: "Не вдалося видалити категорію." };
  }

  revalidatePath("/documents");

  return { success: true };
}

export async function uploadDocument(formData: FormData): Promise<ActionResult> {
  const adminResult = await requireAdmin();

  if ("success" in adminResult) {
    return adminResult;
  }

  const { user } = adminResult;
  const categoryId = String(formData.get("category_id") ?? "");
  const titleInput = String(formData.get("title") ?? "");
  const file = formData.get("file");

  if (!categoryId) {
    return { success: false, error: "Оберіть категорію." };
  }

  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "Оберіть файл для завантаження." };
  }

  if (file.size > DOCUMENTS_MAX_SIZE_BYTES) {
    return { success: false, error: "Файл перевищує максимальний розмір 25 МБ." };
  }

  const originalFilename = resolveOriginalFilename(file, formData);
  const mimeType = resolveDocumentMimeType(originalFilename, file.type);

  if (!mimeType) {
    return {
      success: false,
      error: "Дозволені лише файли PDF, Word, Excel або PowerPoint.",
    };
  }

  if (!isAllowedDocumentExtension(originalFilename)) {
    return {
      success: false,
      error: "Дозволені лише файли PDF, Word, Excel або PowerPoint.",
    };
  }

  const title = titleInput.trim() || defaultTitleFromFilename(originalFilename);
  const titleError = validateDocumentTitle(title);

  if (titleError) {
    return { success: false, error: titleError };
  }

  const supabase = await createClient();

  const { data: category, error: categoryError } = await supabase
    .from("document_categories")
    .select("id")
    .eq("id", categoryId)
    .maybeSingle();

  if (categoryError || !category) {
    return { success: false, error: "Категорію не знайдено." };
  }

  const storagePath = buildDocumentStoragePath(categoryId, originalFilename);
  const fileBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTS_STORAGE_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    console.error("Failed to upload document:", uploadError.message);
    return { success: false, error: "Не вдалося зберегти файл. Спробуйте ще раз." };
  }

  const insertPayload: TablesInsert<"documents"> = {
    category_id: categoryId,
    title,
    storage_path: storagePath,
    original_filename: originalFilename,
    mime_type: mimeType,
    size_bytes: file.size,
    uploaded_by: user.id,
  };

  const { error: insertError } = await supabase
    .from("documents")
    .insert(insertPayload as never);

  if (insertError) {
    await supabase.storage.from(DOCUMENTS_STORAGE_BUCKET).remove([storagePath]);
    console.error("Failed to save document metadata:", insertError.message);
    return { success: false, error: "Не вдалося зберегти метадані документа." };
  }

  revalidatePath("/documents");

  return { success: true };
}

export async function renameDocument(documentId: string, formData: FormData): Promise<ActionResult> {
  const adminResult = await requireAdmin();

  if ("success" in adminResult) {
    return adminResult;
  }

  if (!documentId) {
    return { success: false, error: "Документ не знайдено." };
  }

  const title = String(formData.get("title") ?? "");
  const validationError = validateDocumentTitle(title);

  if (validationError) {
    return { success: false, error: validationError };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("documents")
    .update({ title: title.trim() } as never)
    .eq("id", documentId);

  if (error) {
    console.error("Failed to rename document:", error.message);
    return { success: false, error: "Не вдалося перейменувати документ." };
  }

  revalidatePath("/documents");

  return { success: true };
}

export async function moveDocument(
  documentId: string,
  targetCategoryId: string,
): Promise<ActionResult> {
  const adminResult = await requireAdmin();

  if ("success" in adminResult) {
    return adminResult;
  }

  if (!documentId || !targetCategoryId) {
    return { success: false, error: "Документ або категорію не знайдено." };
  }

  const supabase = await createClient();

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .maybeSingle();

  if (documentError || !document) {
    return { success: false, error: "Документ не знайдено." };
  }

  const currentDocument = document as Document;

  if (currentDocument.category_id === targetCategoryId) {
    return { success: true };
  }

  const { data: targetCategory, error: categoryError } = await supabase
    .from("document_categories")
    .select("id")
    .eq("id", targetCategoryId)
    .maybeSingle();

  if (categoryError || !targetCategory) {
    return { success: false, error: "Цільову категорію не знайдено." };
  }

  const newStoragePath = buildDocumentStoragePath(
    targetCategoryId,
    currentDocument.original_filename,
  );

  const { error: moveError } = await supabase.storage
    .from(DOCUMENTS_STORAGE_BUCKET)
    .move(currentDocument.storage_path, newStoragePath);

  if (moveError) {
    console.error("Failed to move document in storage:", moveError.message);
    return { success: false, error: "Не вдалося перемістити файл у сховищі." };
  }

  const updatePayload: TablesUpdate<"documents"> = {
    category_id: targetCategoryId,
    storage_path: newStoragePath,
  };

  const { error: updateError } = await supabase
    .from("documents")
    .update(updatePayload as never)
    .eq("id", documentId);

  if (updateError) {
    await supabase.storage
      .from(DOCUMENTS_STORAGE_BUCKET)
      .move(newStoragePath, currentDocument.storage_path);
    console.error("Failed to update document category:", updateError.message);
    return { success: false, error: "Не вдалося оновити категорію документа." };
  }

  revalidatePath("/documents");

  return { success: true };
}

export async function deleteDocument(documentId: string): Promise<ActionResult> {
  const adminResult = await requireAdmin();

  if ("success" in adminResult) {
    return adminResult;
  }

  if (!documentId) {
    return { success: false, error: "Документ не знайдено." };
  }

  const supabase = await createClient();

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("storage_path")
    .eq("id", documentId)
    .maybeSingle();

  if (documentError || !document) {
    return { success: false, error: "Документ не знайдено." };
  }

  const { error: deleteDbError } = await supabase
    .from("documents")
    .delete()
    .eq("id", documentId);

  if (deleteDbError) {
    console.error("Failed to delete document metadata:", deleteDbError.message);
    return { success: false, error: "Не вдалося видалити документ." };
  }

  const { error: deleteStorageError } = await supabase.storage
    .from(DOCUMENTS_STORAGE_BUCKET)
    .remove([(document as { storage_path: string }).storage_path]);

  if (deleteStorageError) {
    console.error("Failed to delete document from storage:", deleteStorageError.message);
  }

  revalidatePath("/documents");

  return { success: true };
}

export async function getDocumentById(documentId: string): Promise<Document | null> {
  const user = await getAuthenticatedUser();

  if (!user || !documentId) {
    return null;
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load document:", error.message);
    return null;
  }

  return data as Document | null;
}

export async function reorderCategories(categoryIds: string[]): Promise<ActionResult> {
  const adminResult = await requireAdmin();

  if ("success" in adminResult) {
    return adminResult;
  }

  if (categoryIds.length === 0) {
    return { success: false, error: "Немає категорій для сортування." };
  }

  const uniqueIds = new Set(categoryIds);

  if (uniqueIds.size !== categoryIds.length) {
    return { success: false, error: "Невірний порядок категорій." };
  }

  const supabase = await createClient();

  const updates = categoryIds.map((categoryId, index) =>
    supabase
      .from("document_categories")
      .update({ sort_order: index } as never)
      .eq("id", categoryId),
  );

  const results = await Promise.all(updates);

  const failedUpdate = results.find((result) => result.error);

  if (failedUpdate?.error) {
    console.error("Failed to reorder categories:", failedUpdate.error.message);
    return { success: false, error: "Не вдалося зберегти порядок категорій." };
  }

  revalidatePath("/documents");

  return { success: true };
}
