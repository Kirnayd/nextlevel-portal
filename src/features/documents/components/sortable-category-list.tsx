"use client";

import { useEffect, useMemo, useState } from "react";
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
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

import { reorderCategories } from "@/features/documents/actions";
import type { DocumentCategoryWithDocuments } from "@/features/documents/actions";
import { CategorySection } from "@/features/documents/components/category-section";
import { mergeReorderedVisibleCategories } from "@/features/documents/lib/filter-categories";
import { cn } from "@/shared/lib/utils";

type SortableCategoryListProps = {
  visibleCategories: DocumentCategoryWithDocuments[];
  orderedCategories: DocumentCategoryWithDocuments[];
  allCategories: DocumentCategoryWithDocuments[];
  onOrderChange: (categories: DocumentCategoryWithDocuments[]) => void;
};

type SortableCategoryItemProps = {
  category: DocumentCategoryWithDocuments;
  totalDocumentCount: number;
  allCategories: DocumentCategoryWithDocuments[];
  defaultOpen: boolean;
};

function SortableCategoryItem({
  category,
  totalDocumentCount,
  allCategories,
  defaultOpen,
}: SortableCategoryItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const dragHandle = (
    <button
      type="button"
      className={cn(
        "mt-0.5 inline-flex size-8 shrink-0 cursor-grab items-center justify-center rounded-md border bg-background text-muted-foreground hover:text-foreground active:cursor-grabbing",
        isDragging && "cursor-grabbing",
      )}
      aria-label={`Перетягнути категорію ${category.name}`}
      {...attributes}
      {...listeners}
      onClick={(event) => event.stopPropagation()}
    >
      <GripVertical className="size-4" />
    </button>
  );

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "z-10 opacity-80")}>
      <CategorySection
        category={category}
        totalDocumentCount={totalDocumentCount}
        allCategories={allCategories}
        isAdmin
        defaultOpen={defaultOpen}
        dragHandle={dragHandle}
      />
    </div>
  );
}

export function SortableCategoryList({
  visibleCategories,
  orderedCategories,
  allCategories,
  onOrderChange,
}: SortableCategoryListProps) {
  const [isReordering, setIsReordering] = useState(false);
  const [reorderError, setReorderError] = useState("");

  const documentCountByCategoryId = useMemo(
    () => new Map(allCategories.map((category) => [category.id, category.documents.length])),
    [allCategories],
  );

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

  useEffect(() => {
    setReorderError("");
  }, [visibleCategories, orderedCategories]);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = visibleCategories.findIndex((category) => category.id === active.id);
    const newIndex = visibleCategories.findIndex((category) => category.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const nextOrder = mergeReorderedVisibleCategories(
      orderedCategories,
      visibleCategories,
      String(active.id),
      newIndex,
    );

    const previousOrder = orderedCategories;
    onOrderChange(nextOrder);
    setReorderError("");
    setIsReordering(true);

    try {
      const result = await reorderCategories(nextOrder.map((category) => category.id));

      if (!result.success) {
        onOrderChange(previousOrder);
        setReorderError(result.error);
      }
    } catch (error) {
      onOrderChange(previousOrder);
      const message =
        error instanceof Error ? error.message : "Невідома помилка під час збереження порядку.";

      setReorderError(message);
      console.error("Reorder categories error:", error);
    } finally {
      setIsReordering(false);
    }
  }

  return (
    <div className="space-y-3">
      {isReordering ? (
        <div
          role="status"
          className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary"
        >
          Збереження порядку категорій…
        </div>
      ) : null}

      {reorderError ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {reorderError}
        </div>
      ) : null}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={visibleCategories.map((category) => category.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4">
            {visibleCategories.map((category, index) => (
              <SortableCategoryItem
                key={category.id}
                category={category}
                totalDocumentCount={
                  documentCountByCategoryId.get(category.id) ?? category.documents.length
                }
                allCategories={allCategories}
                defaultOpen={index === 0}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
