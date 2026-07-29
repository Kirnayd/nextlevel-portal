"use client";

import dynamic from "next/dynamic";
import { ExternalLink, FileText } from "lucide-react";

import type { Document, DocumentCategoryWithDocuments } from "@/features/documents/actions";
import {
  formatFileSize,
  formatUploadedAt,
  getMimeTypeLabel,
} from "@/features/documents/lib/format";
import { FileOpenTrigger } from "@/shared/components/file-viewer/file-open-trigger";
import { canOpenInViewer } from "@/shared/lib/file-preview";

const AdminDocumentActions = dynamic(
  () =>
    import("@/features/documents/components/admin-document-actions").then(
      (module) => module.AdminDocumentActions,
    ),
  { ssr: false, loading: () => null },
);

type DocumentRowProps = {
  document: Document;
  categories: DocumentCategoryWithDocuments[];
  isAdmin: boolean;
};

export function DocumentRow({ document, categories, isAdmin }: DocumentRowProps) {
  const downloadUrl = `/api/documents/download?id=${document.id}`;
  const fileTypeLabel = getMimeTypeLabel(document.mime_type);
  const canOpen = canOpenInViewer(document.mime_type);

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <FileText className="mt-0.5 size-5 shrink-0 text-primary" />
          <div className="min-w-0 space-y-1">
            <p className="font-medium">{document.title}</p>
            <p className="truncate text-sm text-muted-foreground">{document.original_filename}</p>
            <p className="text-sm text-muted-foreground">
              {fileTypeLabel} · {formatFileSize(document.size_bytes)}
            </p>
            <p className="text-sm text-muted-foreground">
              Завантажено: {formatUploadedAt(document.created_at)}
            </p>
          </div>
        </div>

        {canOpen ? (
          <FileOpenTrigger
            downloadUrl={downloadUrl}
            filename={document.original_filename}
            mimeType={document.mime_type}
            fileTypeLabel={fileTypeLabel}
            sizeBytes={document.size_bytes}
            label="Відкрити"
            icon={<ExternalLink />}
          />
        ) : null}
      </div>

      {isAdmin ? (
        <AdminDocumentActions document={document} categories={categories} />
      ) : null}
    </div>
  );
}
