import type { DocumentCategoryWithDocuments } from "@/features/documents/actions";
import { UNCATEGORIZED_SUBCATEGORY_LABEL } from "@/features/documents/constants";

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

export function filterCategoriesForDisplay(
  categories: DocumentCategoryWithDocuments[],
  searchQuery: string,
  hideEmpty: boolean,
  isAdmin: boolean,
): DocumentCategoryWithDocuments[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();

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
            if (!isAdmin && subcategory.documents.length === 0) {
              return false;
            }

            return true;
          }

          const subcategoryNameMatches = subcategory.name
            .toLowerCase()
            .includes(normalizedQuery);

          if (categoryNameMatches || subcategoryNameMatches) {
            return subcategory.documents.length > 0 || isAdmin;
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

      const documents = [
        ...subcategories.flatMap((subcategory) => subcategory.documents),
        ...uncategorizedDocuments,
      ];

      return {
        ...category,
        subcategories,
        uncategorizedDocuments,
        documents,
      };
    })
    .filter((category) => {
      if (normalizedQuery) {
        const categoryNameMatches = category.name.toLowerCase().includes(normalizedQuery);
        const hasSubcategoryNameMatch = category.subcategories.some((subcategory) =>
          subcategory.name.toLowerCase().includes(normalizedQuery),
        );

        if (categoryNameMatches || hasSubcategoryNameMatch) {
          return category.documents.length > 0 || isAdmin;
        }

        return category.documents.length > 0;
      }

      if (hideEmpty) {
        return category.documents.length > 0;
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
