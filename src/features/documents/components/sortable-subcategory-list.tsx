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

import { reorderSubcategories } from "@/features/documents/actions";
import type {
  DocumentCategoryWithDocuments,
  DocumentSubcategoryWithDocuments,
} from "@/features/documents/actions";
import { SubcategorySection } from "@/features/documents/components/subcategory-section";
import { mergeReorderedVisibleSubcategories } from "@/features/documents/lib/filter-categories";
import { cn } from "@/shared/lib/utils";

type SortableSubcategoryListProps = {
  categoryId: string;
  subcategories: DocumentSubcategoryWithDocuments[];
  allCategories: DocumentCategoryWithDocuments[];
  documentCountBySubcategoryId: Map<string, number>;
  enableDrag: boolean;
};

type SortableSubcategoryItemProps = {
  subcategory: DocumentSubcategoryWithDocuments;
  totalDocumentCount: number;
  allCategories: DocumentCategoryWithDocuments[];
  enableDrag: boolean;
};

function SortableSubcategoryItem({
  subcategory,
  totalDocumentCount,
  allCategories,
  enableDrag,
}: SortableSubcategoryItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: subcategory.id,
    disabled: !enableDrag,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const dragHandle = enableDrag ? (
    <button
      type="button"
      className={cn(
        "mt-0.5 inline-flex size-7 shrink-0 cursor-grab items-center justify-center rounded-md border bg-background text-muted-foreground hover:text-foreground active:cursor-grabbing",
        isDragging && "cursor-grabbing",
      )}
      aria-label={`Перетягнути підкатегорію ${subcategory.name}`}
      {...attributes}
      {...listeners}
      onClick={(event) => event.stopPropagation()}
    >
      <GripVertical className="size-3.5" />
    </button>
  ) : null;

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "z-10 opacity-80")}>
      <SubcategorySection
        subcategory={subcategory}
        totalDocumentCount={totalDocumentCount}
        allCategories={allCategories}
        isAdmin
        dragHandle={dragHandle}
      />
    </div>
  );
}

export function SortableSubcategoryList({
  categoryId,
  subcategories,
  allCategories,
  documentCountBySubcategoryId,
  enableDrag,
}: SortableSubcategoryListProps) {
  const [orderedSubcategories, setOrderedSubcategories] = useState(subcategories);
  const [isReordering, setIsReordering] = useState(false);
  const [reorderError, setReorderError] = useState("");

  useEffect(() => {
    setOrderedSubcategories(subcategories);
  }, [subcategories]);

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

  async function handleDragEnd(event: DragEndEvent) {
    if (!enableDrag) {
      return;
    }

    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = orderedSubcategories.findIndex((subcategory) => subcategory.id === active.id);
    const newIndex = orderedSubcategories.findIndex((subcategory) => subcategory.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const nextOrder = mergeReorderedVisibleSubcategories(
      orderedSubcategories,
      orderedSubcategories,
      String(active.id),
      newIndex,
    );

    const previousOrder = orderedSubcategories;
    setOrderedSubcategories(nextOrder);
    setReorderError("");
    setIsReordering(true);

    try {
      const result = await reorderSubcategories(
        categoryId,
        nextOrder.map((subcategory) => subcategory.id),
      );

      if (!result.success) {
        setOrderedSubcategories(previousOrder);
        setReorderError(result.error);
      }
    } catch (error) {
      setOrderedSubcategories(previousOrder);
      const message =
        error instanceof Error ? error.message : "Невідома помилка під час збереження порядку.";

      setReorderError(message);
      console.error("Reorder subcategories error:", error);
    } finally {
      setIsReordering(false);
    }
  }

  const subcategoryIds = useMemo(
    () => orderedSubcategories.map((subcategory) => subcategory.id),
    [orderedSubcategories],
  );

  if (orderedSubcategories.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {isReordering ? (
        <div
          role="status"
          className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary"
        >
          Збереження порядку підкатегорій…
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
        <SortableContext items={subcategoryIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {orderedSubcategories.map((subcategory) => (
              <SortableSubcategoryItem
                key={subcategory.id}
                subcategory={subcategory}
                totalDocumentCount={
                  documentCountBySubcategoryId.get(subcategory.id) ?? subcategory.documents.length
                }
                allCategories={allCategories}
                enableDrag={enableDrag}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
