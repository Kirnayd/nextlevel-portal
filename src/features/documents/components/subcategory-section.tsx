"use client";

import dynamic from "next/dynamic";
import { FolderOpen } from "lucide-react";
import type { ReactNode } from "react";

import type {
  Document,
  DocumentCategoryWithDocuments,
  DocumentSubcategoryWithDocuments,
} from "@/features/documents/actions";
import { DocumentRow } from "@/features/documents/components/document-row";

const AdminSubcategoryActions = dynamic(
  () =>
    import("@/features/documents/components/admin-subcategory-actions").then(
      (module) => module.AdminSubcategoryActions,
    ),
  { ssr: false, loading: () => null },
);

type SubcategorySectionProps = {
  subcategory: DocumentSubcategoryWithDocuments;
  totalDocumentCount: number;
  allCategories: DocumentCategoryWithDocuments[];
  isAdmin: boolean;
  dragHandle?: ReactNode;
};

export function SubcategorySection({
  subcategory,
  totalDocumentCount,
  allCategories,
  isAdmin,
  dragHandle,
}: SubcategorySectionProps) {
  return (
    <details className="group rounded-lg border bg-muted/10" open>
      <summary className="cursor-pointer list-none px-4 py-3 [&::-webkit-details-marker]:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            {dragHandle}
            <FolderOpen className="mt-0.5 size-4 shrink-0 text-primary" />
            <p className="font-medium">
              {subcategory.name} · {subcategory.documents.length}
            </p>
          </div>
          <span className="text-sm text-muted-foreground group-open:hidden">Розгорнути</span>
          <span className="hidden text-sm text-muted-foreground group-open:inline">Згорнути</span>
        </div>
      </summary>

      <div className="space-y-4 border-t px-4 py-4">
        {isAdmin ? (
          <AdminSubcategoryActions
            subcategory={subcategory}
            totalDocumentCount={totalDocumentCount}
          />
        ) : null}

        {subcategory.documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">У цій підкатегорії ще немає документів.</p>
        ) : (
          <div className="space-y-3">
            {subcategory.documents.map((document: Document) => (
              <DocumentRow
                key={document.id}
                document={document}
                categories={allCategories}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        )}
      </div>
    </details>
  );
}
