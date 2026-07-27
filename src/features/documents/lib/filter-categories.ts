import type { DocumentCategoryWithDocuments } from "@/features/documents/actions";

export function filterCategoriesForDisplay(
  categories: DocumentCategoryWithDocuments[],
  searchQuery: string,
  hideEmpty: boolean,
): DocumentCategoryWithDocuments[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  return categories
    .map((category) => {
      if (!normalizedQuery) {
        return category;
      }

      const documents = category.documents.filter(
        (document) =>
          document.title.toLowerCase().includes(normalizedQuery) ||
          document.original_filename.toLowerCase().includes(normalizedQuery),
      );

      return { ...category, documents };
    })
    .filter((category) => {
      if (normalizedQuery) {
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
