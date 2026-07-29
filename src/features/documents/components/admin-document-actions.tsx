"use client";

import { FormEvent, useMemo, useState } from "react";
import { ArrowRightLeft, Pencil, Trash2 } from "lucide-react";

import { deleteDocument, moveDocument, renameDocument } from "@/features/documents/actions";
import type { Document, DocumentCategoryWithDocuments } from "@/features/documents/actions";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

type AdminDocumentActionsProps = {
  document: Document;
  categories: DocumentCategoryWithDocuments[];
};

const selectClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export function AdminDocumentActions({ document, categories }: AdminDocumentActionsProps) {
  const [showRenameForm, setShowRenameForm] = useState(false);
  const [showMoveForm, setShowMoveForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState(document.category_id);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId],
  );

  const subcategories = selectedCategory?.subcategories ?? [];

  function resetPanels() {
    setShowRenameForm(false);
    setShowMoveForm(false);
    setShowDeleteConfirm(false);
    setErrorMessage("");
    setSuccessMessage("");
  }

  async function handleRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");
    setIsRenaming(true);

    try {
      const formData = new FormData(event.currentTarget);
      const result = await renameDocument(document.id, formData);

      if (!result.success) {
        setErrorMessage(result.error);
        return;
      }

      setSuccessMessage("Документ перейменовано.");
      setShowRenameForm(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Невідома помилка під час перейменування.";

      setErrorMessage(message);
      console.error("Rename document error:", error);
    } finally {
      setIsRenaming(false);
    }
  }

  async function handleMove(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");
    setIsMoving(true);

    try {
      const formData = new FormData(event.currentTarget);
      const targetCategoryId = String(formData.get("category_id") ?? "");
      const targetSubcategoryInput = String(formData.get("subcategory_id") ?? "").trim();
      const targetSubcategoryId =
        targetSubcategoryInput && targetSubcategoryInput !== "none"
          ? targetSubcategoryInput
          : null;

      const result = await moveDocument(document.id, targetCategoryId, targetSubcategoryId);

      if (!result.success) {
        setErrorMessage(result.error);
        return;
      }

      setSuccessMessage("Документ переміщено.");
      setShowMoveForm(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Невідома помилка під час переміщення.";

      setErrorMessage(message);
      console.error("Move document error:", error);
    } finally {
      setIsMoving(false);
    }
  }

  async function handleDelete() {
    setErrorMessage("");
    setSuccessMessage("");
    setIsDeleting(true);

    try {
      const result = await deleteDocument(document.id);

      if (!result.success) {
        setErrorMessage(result.error);
        return;
      }

      setShowDeleteConfirm(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Невідома помилка під час видалення.";

      setErrorMessage(message);
      console.error("Delete document error:", error);
    } finally {
      setIsDeleting(false);
    }
  }

  const defaultSubcategoryValue = document.subcategory_id ?? "none";

  return (
    <div className="space-y-3 border-t pt-3">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isRenaming || isMoving || isDeleting}
          onClick={() => {
            resetPanels();
            setShowRenameForm(true);
          }}
        >
          <Pencil />
          Перейменувати
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isRenaming || isMoving || isDeleting || categories.length === 0}
          onClick={() => {
            resetPanels();
            setSelectedCategoryId(document.category_id);
            setShowMoveForm(true);
          }}
        >
          <ArrowRightLeft />
          Перемістити
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isRenaming || isMoving || isDeleting}
          onClick={() => {
            resetPanels();
            setShowDeleteConfirm(true);
          }}
        >
          <Trash2 />
          Видалити
        </Button>
      </div>

      {showRenameForm ? (
        <form className="space-y-3 rounded-md border bg-muted/20 p-3" onSubmit={handleRename}>
          <div className="space-y-2">
            <Label htmlFor={`rename-document-${document.id}`}>Нова назва документа</Label>
            <Input
              id={`rename-document-${document.id}`}
              name="title"
              required
              defaultValue={document.title}
              disabled={isRenaming}
            />
          </div>
          <Button type="submit" size="sm" disabled={isRenaming}>
            {isRenaming ? "Збереження…" : "Зберегти"}
          </Button>
        </form>
      ) : null}

      {showMoveForm ? (
        <form className="space-y-3 rounded-md border bg-muted/20 p-3" onSubmit={handleMove}>
          <div className="space-y-2">
            <Label htmlFor={`move-document-category-${document.id}`}>Категорія</Label>
            <select
              id={`move-document-category-${document.id}`}
              name="category_id"
              required
              disabled={isMoving}
              className={selectClassName}
              value={selectedCategoryId}
              onChange={(event) => setSelectedCategoryId(event.target.value)}
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`move-document-subcategory-${document.id}`}>
              Підкатегорія — необов’язково
            </Label>
            <select
              id={`move-document-subcategory-${document.id}`}
              name="subcategory_id"
              disabled={isMoving}
              className={selectClassName}
              defaultValue={defaultSubcategoryValue}
              key={selectedCategoryId}
            >
              <option value="none">Без підкатегорії</option>
              {subcategories.map((subcategory) => (
                <option key={subcategory.id} value={subcategory.id}>
                  {subcategory.name}
                </option>
              ))}
            </select>
          </div>

          <Button type="submit" size="sm" disabled={isMoving}>
            {isMoving ? "Переміщення…" : "Перемістити"}
          </Button>
        </form>
      ) : null}

      {showDeleteConfirm ? (
        <div className="space-y-3 rounded-md border border-destructive/40 bg-destructive/5 p-3">
          <p className="text-sm">
            Видалити документ «{document.title}»? Файл буде видалено без можливості відновлення.
          </p>
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
