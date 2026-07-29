"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { FolderOpen, Plus } from "lucide-react";
import type { ReactNode } from "react";

import type { DocumentCategoryWithDocuments } from "@/features/documents/actions";
import { CreateSubcategoryDialog } from "@/features/documents/components/create-subcategory-dialog";
import { SortableSubcategoryList } from "@/features/documents/components/sortable-subcategory-list";
import { SubcategorySection } from "@/features/documents/components/subcategory-section";
import { UncategorizedDocumentsSection } from "@/features/documents/components/uncategorized-documents-section";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";

const AdminCategoryActions = dynamic(
  () =>
    import("@/features/documents/components/admin-category-actions").then(
      (module) => module.AdminCategoryActions,
    ),
  { ssr: false, loading: () => null },
);

type CategorySectionProps = {
  category: DocumentCategoryWithDocuments;
  totalDocumentCount: number;
  subcategoryCount: number;
  allCategories: DocumentCategoryWithDocuments[];
  isAdmin: boolean;
  defaultOpen?: boolean;
  dragHandle?: ReactNode;
  enableSubcategoryDrag?: boolean;
  documentCountBySubcategoryId: Map<string, number>;
};

export function CategorySection({
  category,
  totalDocumentCount,
  subcategoryCount,
  allCategories,
  isAdmin,
  defaultOpen = false,
  dragHandle,
  enableSubcategoryDrag = false,
  documentCountBySubcategoryId,
}: CategorySectionProps) {
  const [showCreateSubcategoryDialog, setShowCreateSubcategoryDialog] = useState(false);

  const hasVisibleContent =
    category.subcategories.length > 0 || category.uncategorizedDocuments.length > 0;

  const staticSubcategoryList = useMemo(
    () =>
      category.subcategories.map((subcategory) => (
        <SubcategorySection
          key={subcategory.id}
          subcategory={subcategory}
          totalDocumentCount={
            documentCountBySubcategoryId.get(subcategory.id) ?? subcategory.documents.length
          }
          allCategories={allCategories}
          isAdmin={isAdmin}
        />
      )),
    [allCategories, category.subcategories, documentCountBySubcategoryId, isAdmin],
  );

  return (
    <Card>
      <details className="group" open={defaultOpen}>
        <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
          <CardHeader className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                {dragHandle}
                <FolderOpen className="mt-1 size-5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <CardTitle className="text-lg">
                    {category.name} · {totalDocumentCount}
                  </CardTitle>
                </div>
              </div>
              <span className="text-sm text-muted-foreground group-open:hidden">Розгорнути</span>
              <span className="hidden text-sm text-muted-foreground group-open:inline">
                Згорнути
              </span>
            </div>
          </CardHeader>
        </summary>

        <CardContent className="space-y-4 border-t pt-4">
          {isAdmin ? (
            <AdminCategoryActions
              category={category}
              totalDocumentCount={totalDocumentCount}
              subcategoryCount={subcategoryCount}
            />
          ) : null}

          {isAdmin ? (
            <div onClick={(event) => event.stopPropagation()}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCreateSubcategoryDialog(true)}
              >
                <Plus />
                Підкатегорія
              </Button>
            </div>
          ) : null}

          {!hasVisibleContent ? (
            <p className="text-sm text-muted-foreground">
              {totalDocumentCount === 0
                ? "У цій категорії ще немає документів."
                : "Жоден документ не відповідає пошуку."}
            </p>
          ) : (
            <div className="space-y-3">
              {isAdmin && enableSubcategoryDrag ? (
                <SortableSubcategoryList
                  categoryId={category.id}
                  subcategories={category.subcategories}
                  allCategories={allCategories}
                  documentCountBySubcategoryId={documentCountBySubcategoryId}
                  enableDrag={enableSubcategoryDrag}
                />
              ) : (
                staticSubcategoryList
              )}

              <UncategorizedDocumentsSection
                documents={category.uncategorizedDocuments}
                allCategories={allCategories}
                isAdmin={isAdmin}
              />
            </div>
          )}
        </CardContent>
      </details>

      {isAdmin ? (
        <CreateSubcategoryDialog
          categoryId={category.id}
          open={showCreateSubcategoryDialog}
          onClose={() => setShowCreateSubcategoryDialog(false)}
        />
      ) : null}
    </Card>
  );
}
