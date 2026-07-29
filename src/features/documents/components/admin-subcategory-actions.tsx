"use client";

import { FormEvent, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { deleteSubcategory, renameSubcategory } from "@/features/documents/actions";
import type { DocumentSubcategoryWithDocuments } from "@/features/documents/actions";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

type AdminSubcategoryActionsProps = {
  subcategory: DocumentSubcategoryWithDocuments;
  totalDocumentCount: number;
};

export function AdminSubcategoryActions({
  subcategory,
  totalDocumentCount,
}: AdminSubcategoryActionsProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showRenameForm, setShowRenameForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;

    setErrorMessage("");
    setSuccessMessage("");
    setIsRenaming(true);

    try {
      const formData = new FormData(form);
      const result = await renameSubcategory(subcategory.id, formData);

      if (!result.success) {
        setErrorMessage(result.error);
        return;
      }

      setSuccessMessage("Підкатегорію перейменовано.");
      setShowRenameForm(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Невідома помилка під час перейменування.";

      setErrorMessage(message);
      console.error("Rename subcategory error:", error);
    } finally {
      setIsRenaming(false);
    }
  }

  async function handleDelete() {
    setErrorMessage("");
    setSuccessMessage("");
    setIsDeleting(true);

    try {
      const result = await deleteSubcategory(subcategory.id);

      if (!result.success) {
        setErrorMessage(result.error);
        return;
      }

      setShowDeleteConfirm(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Невідома помилка під час видалення.";

      setErrorMessage(message);
      console.error("Delete subcategory error:", error);
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
            <Label htmlFor={`rename-subcategory-${subcategory.id}`}>Нова назва підкатегорії</Label>
            <Input
              id={`rename-subcategory-${subcategory.id}`}
              name="name"
              required
              defaultValue={subcategory.name}
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
            Видалити підкатегорію «{subcategory.name}»? Цю дію не можна скасувати.
          </p>
          {totalDocumentCount > 0 ? (
            <p className="text-sm text-destructive">
              Неможливо видалити підкатегорію, поки в ній є документи.
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
