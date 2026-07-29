"use client";

import type { DocumentCategoryWithDocuments } from "@/features/documents/actions";
import { CategorySection } from "@/features/documents/components/category-section";

type CategoryListProps = {
  visibleCategories: DocumentCategoryWithDocuments[];
  allCategories: DocumentCategoryWithDocuments[];
  isAdmin: boolean;
  documentCountByCategoryId: Map<string, number>;
};

export function CategoryList({
  visibleCategories,
  allCategories,
  isAdmin,
  documentCountByCategoryId,
}: CategoryListProps) {
  return (
    <div className="space-y-4">
      {visibleCategories.map((category, index) => (
        <CategorySection
          key={category.id}
          category={category}
          totalDocumentCount={
            documentCountByCategoryId.get(category.id) ?? category.documents.length
          }
          allCategories={allCategories}
          isAdmin={isAdmin}
          defaultOpen={index === 0}
        />
      ))}
    </div>
  );
}
