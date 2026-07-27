"use client";

import { FolderOpen } from "lucide-react";
import type { ReactNode } from "react";

import type { DocumentCategoryWithDocuments } from "@/features/documents/actions";
import { AdminCategoryActions } from "@/features/documents/components/admin-category-actions";
import { DocumentRow } from "@/features/documents/components/document-row";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

type CategorySectionProps = {
  category: DocumentCategoryWithDocuments;
  totalDocumentCount: number;
  allCategories: DocumentCategoryWithDocuments[];
  isAdmin: boolean;
  defaultOpen?: boolean;
  dragHandle?: ReactNode;
};

export function CategorySection({
  category,
  totalDocumentCount,
  allCategories,
  isAdmin,
  defaultOpen = false,
  dragHandle,
}: CategorySectionProps) {
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
              <span className="hidden text-sm text-muted-foreground group-open:inline">Згорнути</span>
            </div>
          </CardHeader>
        </summary>

        <CardContent className="space-y-4 border-t pt-4">
          {isAdmin ? (
            <AdminCategoryActions
              category={category}
              totalDocumentCount={totalDocumentCount}
            />
          ) : null}

          {category.documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {totalDocumentCount === 0
                ? "У цій категорії ще немає документів."
                : "Жоден документ не відповідає пошуку."}
            </p>
          ) : (
            <div className="space-y-3">
              {category.documents.map((document) => (
                <DocumentRow
                  key={document.id}
                  document={document}
                  categories={allCategories}
                  isAdmin={isAdmin}
                />
              ))}
            </div>
          )}
        </CardContent>
      </details>
    </Card>
  );
}
