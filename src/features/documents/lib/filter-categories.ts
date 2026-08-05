import type { DocumentCategoryWithDocuments } from "@/features/documents/actions";
import { UNCATEGORIZED_SUBCATEGORY_LABEL } from "@/features/documents/constants";
import { getCategoryDocumentCount } from "@/features/documents/lib/category-helpers";

function documentMatchesQuery(
  documentTitle: string,
  documentFilename: string,
  normalizedQuery: string,
): boolean {
  return (
    documentTitle.toLowerCase().includes(normalizedQuery) ||
    documentFilename.toLowerCase().includes(normalizedQuery)
  );
}

/**
 * Derive visible categories for display without mutating the source array.
 *
 * Admin:
 * - empty search → full structure (every category and subcategory, including empty)
 * - active search → matches only; empty named matches still kept for admin
 *
 * Employee:
 * - hideEmpty OFF → full structure
 * - hideEmpty ON → hide categories/subcategories with zero documents
 */
export function filterCategoriesForDisplay(
  categories: DocumentCategoryWithDocuments[],
  searchQuery: string,
  hideEmpty: boolean,
  isAdmin: boolean,
): DocumentCategoryWithDocuments[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  // Admin with no search: never hide empty categories/subcategories.
  if (isAdmin && !normalizedQuery) {
    return categories;
  }

  // Employee with hide-empty off and no search: show full structure.
  if (!isAdmin && !hideEmpty && !normalizedQuery) {
    return categories;
  }

  return categories
    .map((category) => {
      const categoryNameMatches =
        normalizedQuery.length > 0 && category.name.toLowerCase().includes(normalizedQuery);

      const subcategories = category.subcategories
        .map((subcategory) => {
          const subcategoryNameMatches =
            normalizedQuery.length > 0 &&
            subcategory.name.toLowerCase().includes(normalizedQuery);

          const documents = subcategory.documents.filter((document) => {
            if (!normalizedQuery) {
              return true;
            }

            if (categoryNameMatches || subcategoryNameMatches) {
              return true;
            }

            return documentMatchesQuery(
              document.title,
              document.original_filename,
              normalizedQuery,
            );
          });

          return { ...subcategory, documents };
        })
        .filter((subcategory) => {
          if (!normalizedQuery) {
            // Employee hide-empty ON: drop empty subcategories.
            if (!isAdmin && hideEmpty && subcategory.documents.length === 0) {
              return false;
            }

            return true;
          }

          const subcategoryNameMatches = subcategory.name
            .toLowerCase()
            .includes(normalizedQuery);

          if (categoryNameMatches || subcategoryNameMatches) {
            // Keep empty named matches for admin; employees need docs or name alone is enough for structure.
            return subcategory.documents.length > 0 || isAdmin || subcategoryNameMatches;
          }

          return subcategory.documents.length > 0;
        });

      const uncategorizedDocuments = category.uncategorizedDocuments.filter((document) => {
        if (!normalizedQuery) {
          return true;
        }

        if (categoryNameMatches) {
          return true;
        }

        return documentMatchesQuery(
          document.title,
          document.original_filename,
          normalizedQuery,
        );
      });

      return {
        ...category,
        subcategories,
        uncategorizedDocuments,
      };
    })
    .filter((category) => {
      const documentCount = getCategoryDocumentCount(category);

      if (normalizedQuery) {
        const categoryNameMatches = category.name.toLowerCase().includes(normalizedQuery);
        const hasSubcategoryNameMatch = category.subcategories.some((subcategory) =>
          subcategory.name.toLowerCase().includes(normalizedQuery),
        );

        if (categoryNameMatches || hasSubcategoryNameMatch) {
          return documentCount > 0 || isAdmin;
        }

        return documentCount > 0;
      }

      // Employee hide-empty ON: hide empty categories.
      if (!isAdmin && hideEmpty) {
        return documentCount > 0;
      }

      return true;
    });
}

export function mergeReorderedVisibleCategories(
  allCategories: DocumentCategoryWithDocuments[],
  visibleCategories: DocumentCategoryWithDocuments[],
  activeId: string,
  overIndex: number,
): DocumentCategoryWithDocuments[] {
  const visibleIds = new Set(visibleCategories.map((category) => category.id));
  const oldIndex = visibleCategories.findIndex((category) => category.id === activeId);

  if (oldIndex === -1 || overIndex === -1 || oldIndex === overIndex) {
    return allCategories;
  }

  const reorderedVisible = [...visibleCategories];
  const [movedCategory] = reorderedVisible.splice(oldIndex, 1);
  reorderedVisible.splice(overIndex, 0, movedCategory);

  let visibleIndex = 0;

  return allCategories.map((category) => {
    if (!visibleIds.has(category.id)) {
      return category;
    }

    const nextCategory = reorderedVisible[visibleIndex];
    visibleIndex += 1;
    return nextCategory;
  });
}

export function mergeReorderedVisibleSubcategories(
  allSubcategories: DocumentCategoryWithDocuments["subcategories"],
  visibleSubcategories: DocumentCategoryWithDocuments["subcategories"],
  activeId: string,
  overIndex: number,
): DocumentCategoryWithDocuments["subcategories"] {
  const visibleIds = new Set(visibleSubcategories.map((subcategory) => subcategory.id));
  const oldIndex = visibleSubcategories.findIndex((subcategory) => subcategory.id === activeId);

  if (oldIndex === -1 || overIndex === -1 || oldIndex === overIndex) {
    return allSubcategories;
  }

  const reorderedVisible = [...visibleSubcategories];
  const [movedSubcategory] = reorderedVisible.splice(oldIndex, 1);
  reorderedVisible.splice(overIndex, 0, movedSubcategory);

  let visibleIndex = 0;

  return allSubcategories.map((subcategory) => {
    if (!visibleIds.has(subcategory.id)) {
      return subcategory;
    }

    const nextSubcategory = reorderedVisible[visibleIndex];
    visibleIndex += 1;
    return nextSubcategory;
  });
}

export function getUncategorizedSectionLabel(): string {
  return UNCATEGORIZED_SUBCATEGORY_LABEL;
}
