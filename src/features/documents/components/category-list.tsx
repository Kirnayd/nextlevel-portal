"use client";

import type { DocumentCategoryWithDocuments } from "@/features/documents/actions";
import { getCategoryDocumentCount } from "@/features/documents/lib/category-helpers";
import { CategorySection } from "@/features/documents/components/category-section";

type CategoryListProps = {
  visibleCategories: DocumentCategoryWithDocuments[];
  allCategories: DocumentCategoryWithDocuments[];
  isAdmin: boolean;
  documentCountByCategoryId: Map<string, number>;
  subcategoryCountByCategoryId: Map<string, number>;
  documentCountBySubcategoryId: Map<string, number>;
  enableSubcategoryDrag?: boolean;
};

export function CategoryList({
  visibleCategories,
  allCategories,
  isAdmin,
  documentCountByCategoryId,
  subcategoryCountByCategoryId,
  documentCountBySubcategoryId,
  enableSubcategoryDrag = false,
}: CategoryListProps) {
  return (
    <div className="space-y-4">
      {visibleCategories.map((category, index) => (
        <CategorySection
          key={category.id}
          category={category}
          totalDocumentCount={
            documentCountByCategoryId.get(category.id) ?? getCategoryDocumentCount(category)
          }
          subcategoryCount={subcategoryCountByCategoryId.get(category.id) ?? category.subcategories.length}
          allCategories={allCategories}
          isAdmin={isAdmin}
          defaultOpen={index === 0}
          enableSubcategoryDrag={enableSubcategoryDrag}
          documentCountBySubcategoryId={documentCountBySubcategoryId}
        />
      ))}
    </div>
  );
}
