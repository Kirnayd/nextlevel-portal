"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Upload } from "lucide-react";

import {
  deleteAnnouncementImage,
  reorderAnnouncementImages,
  uploadAnnouncementImage,
} from "@/features/announcements/actions";
import type { AnnouncementImage } from "@/features/announcements/actions";
import {
  ANNOUNCEMENT_ALLOWED_IMAGE_EXTENSIONS,
  ANNOUNCEMENT_MAX_IMAGES,
  getAnnouncementImageUrl,
} from "@/features/announcements/constants";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { cn } from "@/shared/lib/utils";

type AdminAnnouncementImagesProps = {
  announcementId: string;
  images: AnnouncementImage[];
};

type SortableImageItemProps = {
  image: AnnouncementImage;
  isCover: boolean;
  isBusy: boolean;
  onDelete: (imageId: string) => void;
};

function SortableImageItem({ image, isCover, isBusy, onDelete }: SortableImageItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: image.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative overflow-hidden rounded-lg border bg-muted/20",
        isDragging && "z-10 opacity-80",
        isCover && "ring-2 ring-primary/40",
      )}
    >
      <div className="aspect-[4/3]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={getAnnouncementImageUrl(image.id)}
          alt=""
          className="size-full object-cover"
          loading="lazy"
        />
      </div>

      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2">
        {isCover ? (
          <span className="rounded bg-background/90 px-2 py-0.5 text-xs font-medium">Обкладинка</span>
        ) : (
          <span />
        )}

        <div className="flex gap-1">
          <button
            type="button"
            className="inline-flex size-8 items-center justify-center rounded-md border bg-background/90 text-muted-foreground hover:text-foreground"
            aria-label="Перетягнути зображення"
            disabled={isBusy}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 bg-background/90"
            disabled={isBusy}
            onClick={() => onDelete(image.id)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AdminAnnouncementImages({ announcementId, images }: AdminAnnouncementImagesProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [orderedImages, setOrderedImages] = useState(images);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setOrderedImages(images);
  }, [images]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const remainingSlots = ANNOUNCEMENT_MAX_IMAGES - orderedImages.length;
  const acceptValue = ANNOUNCEMENT_ALLOWED_IMAGE_EXTENSIONS.join(",");
  const isBusy = isUploading || isReordering || isDeleting;

  const imageIds = useMemo(() => orderedImages.map((image) => image.id), [orderedImages]);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);

    if (selectedFiles.length === 0) {
      return;
    }

    if (selectedFiles.length > remainingSlots) {
      setErrorMessage(`Можна додати ще не більше ${remainingSlots} зображень.`);
      event.target.value = "";
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setIsUploading(true);

    try {
      let hadError = false;

      for (const file of selectedFiles) {
        const payload = new FormData();
        payload.append("image", file, file.name);

        const result = await uploadAnnouncementImage(announcementId, payload);

        if (!result.success) {
          setErrorMessage(result.error);
          hadError = true;
          break;
        }
      }

      if (!hadError) {
        setSuccessMessage("Зображення завантажено.");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Невідома помилка під час завантаження.";

      setErrorMessage(message);
      console.error("Upload announcement images error:", error);
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  async function handleDelete(imageId: string) {
    setErrorMessage("");
    setSuccessMessage("");
    setIsDeleting(true);

    try {
      const result = await deleteAnnouncementImage(imageId);

      if (!result.success) {
        setErrorMessage(result.error);
        return;
      }

      setSuccessMessage("Зображення видалено.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Невідома помилка під час видалення.";

      setErrorMessage(message);
      console.error("Delete announcement image error:", error);
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = orderedImages.findIndex((image) => image.id === active.id);
    const newIndex = orderedImages.findIndex((image) => image.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const nextOrder = arrayMove(orderedImages, oldIndex, newIndex);
    const previousOrder = orderedImages;

    setOrderedImages(nextOrder);
    setErrorMessage("");
    setSuccessMessage("");
    setIsReordering(true);

    try {
      const result = await reorderAnnouncementImages(
        announcementId,
        nextOrder.map((image) => image.id),
      );

      if (!result.success) {
        setOrderedImages(previousOrder);
        setErrorMessage(result.error);
        return;
      }

      setSuccessMessage("Порядок зображень збережено.");
    } catch (error) {
      setOrderedImages(previousOrder);
      const message =
        error instanceof Error ? error.message : "Невідома помилка під час збереження порядку.";

      setErrorMessage(message);
      console.error("Reorder announcement images error:", error);
    } finally {
      setIsReordering(false);
    }
  }

  return (
    <div className="space-y-4 border-t pt-4">
      <div className="space-y-2">
        <Label htmlFor={`announcement-images-${announcementId}`}>Зображення</Label>
        <div className="flex flex-wrap items-center gap-3">
          <Input
            ref={fileInputRef}
            id={`announcement-images-${announcementId}`}
            type="file"
            accept={acceptValue}
            multiple
            disabled={isBusy || remainingSlots <= 0}
            className="max-w-md"
            onChange={handleUpload}
          />
          <p className="text-sm text-muted-foreground">
            JPG, PNG, WEBP. До {ANNOUNCEMENT_MAX_IMAGES} зображень, максимум 10 МБ кожне.
          </p>
        </div>
        {remainingSlots <= 0 ? (
          <p className="text-sm text-muted-foreground">Досягнуто ліміт зображень.</p>
        ) : null}
        {isUploading ? (
          <p className="text-sm text-primary" role="status">
            Завантаження зображень…
          </p>
        ) : null}
        {isReordering ? (
          <p className="text-sm text-primary" role="status">
            Збереження порядку зображень…
          </p>
        ) : null}
      </div>

      {orderedImages.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={imageIds} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {orderedImages.map((image, index) => (
                <SortableImageItem
                  key={image.id}
                  image={image}
                  isCover={index === 0}
                  isBusy={isBusy}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
          <Upload className="mx-auto mb-2 size-5 opacity-60" />
          Зображень ще немає. Перше завантажене зображення стане обкладинкою.
        </div>
      )}

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
