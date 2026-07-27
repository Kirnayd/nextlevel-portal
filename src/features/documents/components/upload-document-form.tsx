"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { uploadDocument } from "@/features/documents/actions";
import type { DocumentCategoryWithDocuments } from "@/features/documents/actions";
import { DOCUMENTS_ALLOWED_EXTENSIONS } from "@/features/documents/constants";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

type UploadDocumentFormProps = {
  categories: DocumentCategoryWithDocuments[];
  onSuccess?: () => void;
};

function buildUploadPayload(form: HTMLFormElement, file: File): FormData {
  const payload = new FormData();
  const categoryId = form.elements.namedItem("category_id");
  const titleField = form.elements.namedItem("title");

  if (categoryId instanceof HTMLSelectElement) {
    payload.append("category_id", categoryId.value);
  }

  if (titleField instanceof HTMLInputElement) {
    payload.append("title", titleField.value);
  }

  payload.append("file", file, file.name);
  payload.append("original_filename", file.name);

  return payload;
}

export function UploadDocumentForm({ categories, onSuccess }: UploadDocumentFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isUploading) {
      return;
    }

    const form = formRef.current ?? event.currentTarget;
    const selectedFile = fileInputRef.current?.files?.[0];

    if (!selectedFile) {
      setErrorMessage("Оберіть файл для завантаження.");
      return;
    }

    const payload = buildUploadPayload(form, selectedFile);

    setErrorMessage("");
    setSuccessMessage("");
    setIsUploading(true);

    try {
      const result = await uploadDocument(payload);

      if (!result.success) {
        setErrorMessage(result.error);
        return;
      }

      form.reset();
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setSuccessMessage("Документ завантажено.");
      router.refresh();
      onSuccess?.();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Невідома помилка під час завантаження.";

      setErrorMessage(message);
      console.error("Upload document error:", error);
    } finally {
      setIsUploading(false);
    }
  }

  if (categories.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Спочатку створіть категорію, щоб завантажити документ.
      </p>
    );
  }

  const acceptValue = DOCUMENTS_ALLOWED_EXTENSIONS.join(",");

  return (
    <form ref={formRef} className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="document-category">Категорія</Label>
        <select
          id="document-category"
          name="category_id"
          required
          disabled={isUploading}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          defaultValue={categories[0]?.id}
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="document-title">Назва документа</Label>
        <Input
          id="document-title"
          name="title"
          disabled={isUploading}
          placeholder="Необов’язково — буде взято з імені файлу"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="document-file">Файл</Label>
        <Input
          ref={fileInputRef}
          id="document-file"
          name="file"
          type="file"
          accept={acceptValue}
          required
          disabled={isUploading}
        />
        <p className="text-sm text-muted-foreground">
          Дозволені формати: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX. Максимальний розмір: 25 МБ.
        </p>
      </div>

      {errorMessage ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div
          role="status"
          className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300"
        >
          {successMessage}
        </div>
      ) : null}

      <Button type="submit" disabled={isUploading}>
        {isUploading ? "Завантаження…" : "Завантажити документ"}
      </Button>
    </form>
  );
}
