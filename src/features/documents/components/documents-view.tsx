"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

import type { DocumentCategoryWithDocuments } from "@/features/documents/actions";
import { CategoryList } from "@/features/documents/components/category-list";
import { DocumentsControls } from "@/features/documents/components/documents-controls";
import { getCategoryDocumentCount } from "@/features/documents/lib/category-helpers";
import { filterCategoriesForDisplay } from "@/features/documents/lib/filter-categories";
import { useHideEmptyCategoriesPreference } from "@/features/documents/lib/use-hide-empty-categories";
import { useDebouncedValue } from "@/shared/lib/use-debounced-value";
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
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 250);
  // Source of truth — never overwritten by search/hide-empty filtering.
  const [allCategories, setAllCategories] = useState(categories);

  const employeeHideEmptyPreference = useHideEmptyCategoriesPreference(true);
  const hideEmpty = isAdmin ? false : employeeHideEmptyPreference.hideEmpty;
  const preferencesReady = isAdmin ? true : employeeHideEmptyPreference.isReady;

  useEffect(() => {
    setAllCategories(categories);
  }, [categories]);

  const visibleCategories = useMemo(() => {
    if (isAdmin && debouncedSearchQuery.trim().length === 0) {
      return allCategories;
    }

    return filterCategoriesForDisplay(
      allCategories,
      debouncedSearchQuery,
      hideEmpty,
      isAdmin,
    );
  }, [allCategories, debouncedSearchQuery, hideEmpty, isAdmin]);

  const documentCountByCategoryId = useMemo(
    () =>
      new Map(allCategories.map((category) => [category.id, getCategoryDocumentCount(category)])),
    [allCategories],
  );

  const subcategoryCountByCategoryId = useMemo(
    () => new Map(allCategories.map((category) => [category.id, category.subcategories.length])),
    [allCategories],
  );

  const documentCountBySubcategoryId = useMemo(() => {
    const counts = new Map<string, number>();

    for (const category of allCategories) {
      for (const subcategory of category.subcategories) {
        counts.set(subcategory.id, subcategory.documents.length);
      }
    }

    return counts;
  }, [allCategories]);

  const isDragEnabled = isAdmin && debouncedSearchQuery.trim().length === 0;
  const hasSearchQuery = debouncedSearchQuery.trim().length > 0;
  const hasCategories = allCategories.length > 0;

  return (
    <div className="space-y-6">
      {isAdmin ? <AdminToolbar categories={allCategories} /> : null}

      {hasCategories ? (
        <DocumentsControls
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          hideEmpty={hideEmpty}
          onHideEmptyChange={employeeHideEmptyPreference.setHideEmpty}
          preferencesReady={preferencesReady}
          showHideEmptyToggle={!isAdmin}
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
                : isAdmin
                  ? "Немає категорій для відображення."
                  : "Усі категорії порожні. Вимкніть «Приховати порожні категорії», щоб їх побачити."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : isDragEnabled ? (
        <SortableCategoryList
          visibleCategories={visibleCategories}
          orderedCategories={allCategories}
          allCategories={allCategories}
          onOrderChange={setAllCategories}
        />
      ) : (
        <CategoryList
          visibleCategories={visibleCategories}
          allCategories={allCategories}
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
