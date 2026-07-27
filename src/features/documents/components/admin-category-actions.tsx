"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";

import { deleteCategory, renameCategory } from "@/features/documents/actions";
import type { DocumentCategoryWithDocuments } from "@/features/documents/actions";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

type AdminCategoryActionsProps = {
  category: DocumentCategoryWithDocuments;
  totalDocumentCount: number;
};

export function AdminCategoryActions({ category, totalDocumentCount }: AdminCategoryActionsProps) {
  const router = useRouter();
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showRenameForm, setShowRenameForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");
    setIsRenaming(true);

    try {
      const formData = new FormData(event.currentTarget);
      const result = await renameCategory(category.id, formData);

      if (!result.success) {
        setErrorMessage(result.error);
        return;
      }

      setSuccessMessage("Категорію перейменовано.");
      setShowRenameForm(false);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Невідома помилка під час перейменування.";

      setErrorMessage(message);
      console.error("Rename category error:", error);
    } finally {
      setIsRenaming(false);
    }
  }

  async function handleDelete() {
    setErrorMessage("");
    setSuccessMessage("");
    setIsDeleting(true);

    try {
      const result = await deleteCategory(category.id);

      if (!result.success) {
        setErrorMessage(result.error);
        return;
      }

      setShowDeleteConfirm(false);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Невідома помилка під час видалення.";

      setErrorMessage(message);
      console.error("Delete category error:", error);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-3" onClick={(event) => event.stopPropagation()}>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isRenaming || isDeleting}
          onClick={() => {
            setShowRenameForm((current) => !current);
            setShowDeleteConfirm(false);
            setErrorMessage("");
            setSuccessMessage("");
          }}
        >
          <Pencil />
          Перейменувати
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isRenaming || isDeleting}
          onClick={() => {
            setShowDeleteConfirm((current) => !current);
            setShowRenameForm(false);
            setErrorMessage("");
            setSuccessMessage("");
          }}
        >
          <Trash2 />
          Видалити
        </Button>
      </div>

      {showRenameForm ? (
        <form className="space-y-3 rounded-md border bg-muted/20 p-3" onSubmit={handleRename}>
          <div className="space-y-2">
            <Label htmlFor={`rename-category-${category.id}`}>Нова назва категорії</Label>
            <Input
              id={`rename-category-${category.id}`}
              name="name"
              required
              defaultValue={category.name}
              disabled={isRenaming}
            />
          </div>
          <Button type="submit" size="sm" disabled={isRenaming}>
            {isRenaming ? "Збереження…" : "Зберегти"}
          </Button>
        </form>
      ) : null}

      {showDeleteConfirm ? (
        <div className="space-y-3 rounded-md border border-destructive/40 bg-destructive/5 p-3">
          <p className="text-sm">
            Видалити категорію «{category.name}»? Цю дію не можна скасувати.
          </p>
          {totalDocumentCount > 0 ? (
            <p className="text-sm text-destructive">
              У категорії є документи ({totalDocumentCount}). Спочатку видаліть або
              перемістіть їх.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isDeleting}
                onClick={handleDelete}
              >
                {isDeleting ? "Видалення…" : "Підтвердити видалення"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isDeleting}
                onClick={() => setShowDeleteConfirm(false)}
              >
                Скасувати
              </Button>
            </div>
          )}
        </div>
      ) : null}

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
    </div>
  );
}
