"use client";

import { useEffect, useMemo, useState } from "react";

import type { DocumentCategoryWithDocuments } from "@/features/documents/actions";
import { AdminToolbar } from "@/features/documents/components/admin-toolbar";
import { DocumentsControls } from "@/features/documents/components/documents-controls";
import { SortableCategoryList } from "@/features/documents/components/sortable-category-list";
import { filterCategoriesForDisplay } from "@/features/documents/lib/filter-categories";
import { useHideEmptyCategoriesPreference } from "@/features/documents/lib/use-hide-empty-categories";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

type DocumentsViewProps = {
  categories: DocumentCategoryWithDocuments[];
  isAdmin: boolean;
};

export function DocumentsView({ categories, isAdmin }: DocumentsViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [orderedCategories, setOrderedCategories] = useState(categories);
  const { hideEmpty, setHideEmpty, isReady: preferencesReady } =
    useHideEmptyCategoriesPreference(true);

  useEffect(() => {
    setOrderedCategories(categories);
  }, [categories]);

  const visibleCategories = useMemo(
    () => filterCategoriesForDisplay(orderedCategories, searchQuery, hideEmpty),
    [orderedCategories, searchQuery, hideEmpty],
  );

  const isDragEnabled = isAdmin && searchQuery.trim().length === 0;
  const hasSearchQuery = searchQuery.trim().length > 0;
  const hasCategories = orderedCategories.length > 0;

  return (
    <div className="space-y-6">
      {isAdmin ? <AdminToolbar categories={orderedCategories} /> : null}

      {hasCategories ? (
        <DocumentsControls
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          hideEmpty={hideEmpty}
          onHideEmptyChange={setHideEmpty}
          preferencesReady={preferencesReady}
        />
      ) : null}

      {!hasCategories ? (
        <Card>
          <CardHeader>
            <CardTitle>Категорій ще немає</CardTitle>
            <CardDescription>
              {isAdmin
                ? "Створіть першу категорію, щоб почати завантажувати документи."
                : "Адміністратор ще не додав категорії документів."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : visibleCategories.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {hasSearchQuery ? "Нічого не знайдено" : "Немає категорій для відображення"}
            </CardTitle>
            <CardDescription>
              {hasSearchQuery
                ? "Спробуйте інший запит або очистіть поле пошуку."
                : "Усі категорії порожні. Вимкніть «Приховати порожні категорії», щоб їх побачити."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <SortableCategoryList
          visibleCategories={visibleCategories}
          orderedCategories={orderedCategories}
          allCategories={orderedCategories}
          isAdmin={isAdmin}
          isDragEnabled={isDragEnabled}
          onOrderChange={setOrderedCategories}
        />
      )}
    </div>
  );
}
