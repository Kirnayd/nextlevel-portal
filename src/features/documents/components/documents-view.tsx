"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

import type { DocumentCategoryWithDocuments } from "@/features/documents/actions";
import { CategoryList } from "@/features/documents/components/category-list";
import { DocumentsControls } from "@/features/documents/components/documents-controls";
import { filterCategoriesForDisplay } from "@/features/documents/lib/filter-categories";
import { useHideEmptyCategoriesPreference } from "@/features/documents/lib/use-hide-empty-categories";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

const AdminToolbar = dynamic(
  () =>
    import("@/features/documents/components/admin-toolbar").then(
      (module) => module.AdminToolbar,
    ),
  { ssr: false, loading: () => null },
);

const SortableCategoryList = dynamic(
  () =>
    import("@/features/documents/components/sortable-category-list").then(
      (module) => module.SortableCategoryList,
    ),
  { ssr: false, loading: () => null },
);

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
    () => filterCategoriesForDisplay(orderedCategories, searchQuery, hideEmpty, isAdmin),
    [orderedCategories, searchQuery, hideEmpty, isAdmin],
  );

  const documentCountByCategoryId = useMemo(
    () => new Map(orderedCategories.map((category) => [category.id, category.documents.length])),
    [orderedCategories],
  );

  const subcategoryCountByCategoryId = useMemo(
    () => new Map(orderedCategories.map((category) => [category.id, category.subcategories.length])),
    [orderedCategories],
  );

  const documentCountBySubcategoryId = useMemo(() => {
    const counts = new Map<string, number>();

    for (const category of orderedCategories) {
      for (const subcategory of category.subcategories) {
        counts.set(subcategory.id, subcategory.documents.length);
      }
    }

    return counts;
  }, [orderedCategories]);

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
      ) : isDragEnabled ? (
        <SortableCategoryList
          visibleCategories={visibleCategories}
          orderedCategories={orderedCategories}
          allCategories={orderedCategories}
          onOrderChange={setOrderedCategories}
        />
      ) : (
        <CategoryList
          visibleCategories={visibleCategories}
          allCategories={orderedCategories}
          isAdmin={isAdmin}
          documentCountByCategoryId={documentCountByCategoryId}
          subcategoryCountByCategoryId={subcategoryCountByCategoryId}
          documentCountBySubcategoryId={documentCountBySubcategoryId}
          enableSubcategoryDrag={false}
        />
      )}
    </div>
  );
}
