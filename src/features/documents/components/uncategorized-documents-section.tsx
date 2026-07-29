"use client";

import { FolderOpen } from "lucide-react";

import type { Document, DocumentCategoryWithDocuments } from "@/features/documents/actions";
import { UNCATEGORIZED_SUBCATEGORY_LABEL } from "@/features/documents/constants";
import { DocumentRow } from "@/features/documents/components/document-row";
import { formatSubcategoryHeading } from "@/features/documents/lib/format";

type UncategorizedDocumentsSectionProps = {
  documents: Document[];
  documentCount: number;
  allCategories: DocumentCategoryWithDocuments[];
  isAdmin: boolean;
};

export function UncategorizedDocumentsSection({
  documents,
  documentCount,
  allCategories,
  isAdmin,
}: UncategorizedDocumentsSectionProps) {
  if (documents.length === 0) {
    return null;
  }

  return (
    <details className="group rounded-lg border bg-muted/10" open>
      <summary className="cursor-pointer list-none px-4 py-3 [&::-webkit-details-marker]:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <FolderOpen className="mt-0.5 size-4 shrink-0 text-primary" />
            <p className="font-medium">
              {formatSubcategoryHeading(UNCATEGORIZED_SUBCATEGORY_LABEL, documentCount)}
            </p>
          </div>
          <span className="text-sm text-muted-foreground group-open:hidden">Розгорнути</span>
          <span className="hidden text-sm text-muted-foreground group-open:inline">Згорнути</span>
        </div>
      </summary>

      <div className="space-y-3 border-t px-4 py-4">
        {documents.map((document) => (
          <DocumentRow
            key={document.id}
            document={document}
            categories={allCategories}
            isAdmin={isAdmin}
          />
        ))}
      </div>
    </details>
  );
}
