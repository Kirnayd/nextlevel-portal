"use client";

import { useState } from "react";
import { Eye, EyeOff, Pencil, Pin, PinOff, Trash2 } from "lucide-react";

import {
  deleteAnnouncement,
  togglePinned,
  togglePublished,
} from "@/features/announcements/actions";
import type { AnnouncementWithImages } from "@/features/announcements/actions";
import { AnnouncementForm } from "@/features/announcements/components/announcement-form";
import { Button } from "@/shared/components/ui/button";

type AdminAnnouncementActionsProps = {
  announcement: AnnouncementWithImages;
};

export function AdminAnnouncementActions({ announcement }: AdminAnnouncementActionsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  async function runAction(
    action: () => Promise<{ success: true } | { success: false; error: string }>,
    successText?: string,
  ) {
    setErrorMessage("");
    setSuccessMessage("");
    setIsBusy(true);

    try {
      const result = await action();

      if (!result.success) {
        setErrorMessage(result.error);
        return;
      }

      if (successText) {
        setSuccessMessage(successText);
      }

    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Невідома помилка під час виконання дії.";

      setErrorMessage(message);
      console.error("Announcement admin action error:", error);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDelete() {
    setErrorMessage("");
    setSuccessMessage("");
    setIsBusy(true);

    try {
      const result = await deleteAnnouncement(announcement.id);

      if (!result.success) {
        setErrorMessage(result.error);
        return;
      }

      setShowDeleteConfirm(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Невідома помилка під час видалення.";

      setErrorMessage(message);
      console.error("Delete announcement error:", error);
    } finally {
      setIsBusy(false);
    }
  }

  if (isEditing) {
    return (
      <div className="border-t pt-4">
        <AnnouncementForm
          mode="edit"
          announcement={announcement}
          onSuccess={() => {
            setIsEditing(false);
            setSuccessMessage("Оголошення збережено.");
          }}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3 border-t pt-4">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isBusy}
          onClick={() => {
            setShowDeleteConfirm(false);
            setIsEditing(true);
            setErrorMessage("");
            setSuccessMessage("");
          }}
        >
          <Pencil />
          Редагувати
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isBusy}
          onClick={() =>
            runAction(
              () => togglePinned(announcement.id),
              announcement.is_pinned ? "Оголошення відкріплено." : "Оголошення закріплено.",
            )
          }
        >
          {announcement.is_pinned ? <PinOff /> : <Pin />}
          {announcement.is_pinned ? "Відкріпити" : "Закріпити"}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isBusy}
          onClick={() =>
            runAction(
              () => togglePublished(announcement.id),
              announcement.is_published ? "Оголошення приховано." : "Оголошення опубліковано.",
            )
          }
        >
          {announcement.is_published ? <EyeOff /> : <Eye />}
          {announcement.is_published ? "Приховати" : "Опублікувати"}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isBusy}
          onClick={() => {
            setShowDeleteConfirm((current) => !current);
            setErrorMessage("");
            setSuccessMessage("");
          }}
        >
          <Trash2 />
          Видалити
        </Button>
      </div>

      {showDeleteConfirm ? (
        <div className="space-y-3 rounded-md border border-destructive/40 bg-destructive/5 p-3">
          <p className="text-sm">
            Видалити оголошення «{announcement.title}»? Цю дію не можна скасувати.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isBusy}
              onClick={handleDelete}
            >
              {isBusy ? "Видалення…" : "Підтвердити видалення"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isBusy}
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
