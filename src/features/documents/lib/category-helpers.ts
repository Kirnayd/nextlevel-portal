import type { Document, DocumentCategoryWithDocuments } from "@/features/documents/actions";

export function getCategoryDocumentCount(
  category: Pick<DocumentCategoryWithDocuments, "subcategories" | "uncategorizedDocuments">,
): number {
  return (
    category.subcategories.reduce((sum, subcategory) => sum + subcategory.documents.length, 0) +
    category.uncategorizedDocuments.length
  );
}

export function getCategoryDocuments(
  category: Pick<DocumentCategoryWithDocuments, "subcategories" | "uncategorizedDocuments">,
): Document[] {
  return [
    ...category.subcategories.flatMap((subcategory) => subcategory.documents),
    ...category.uncategorizedDocuments,
  ];
}
