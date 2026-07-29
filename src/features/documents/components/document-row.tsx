import { Download, ExternalLink, FileText } from "lucide-react";

import type { Document, DocumentCategoryWithDocuments } from "@/features/documents/actions";
import { AdminDocumentActions } from "@/features/documents/components/admin-document-actions";
import {
  formatFileSize,
  formatUploadedAt,
  getMimeTypeLabel,
} from "@/features/documents/lib/format";
import { FileOpenTrigger } from "@/shared/components/file-viewer/file-open-trigger";
import { isPdfMimeType } from "@/shared/lib/file-types";

type DocumentRowProps = {
  document: Document;
  categories: DocumentCategoryWithDocuments[];
  isAdmin: boolean;
};

function isPdfDocument(mimeType: string): boolean {
  return isPdfMimeType(mimeType);
}

export function DocumentRow({ document, categories, isAdmin }: DocumentRowProps) {
  const downloadUrl = `/api/documents/download?id=${document.id}`;
  const isPdf = isPdfDocument(document.mime_type);
  const fileTypeLabel = getMimeTypeLabel(document.mime_type);

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <FileText className="mt-0.5 size-5 shrink-0 text-primary" />
          <div className="min-w-0 space-y-1">
            <p className="font-medium">{document.title}</p>
            <p className="truncate text-sm text-muted-foreground">{document.original_filename}</p>
            <p className="text-sm text-muted-foreground">
              {getMimeTypeLabel(document.mime_type)} · {formatFileSize(document.size_bytes)}
            </p>
            <p className="text-sm text-muted-foreground">
              Завантажено: {formatUploadedAt(document.created_at)}
            </p>
          </div>
        </div>

        <FileOpenTrigger
          downloadUrl={downloadUrl}
          filename={document.original_filename}
          mimeType={document.mime_type}
          fileTypeLabel={fileTypeLabel}
          sizeBytes={document.size_bytes}
          label={isPdf ? "Відкрити PDF" : "Відкрити"}
          icon={isPdf ? <ExternalLink /> : <Download />}
          variant={isPdf ? "default" : "outline"}
        />
      </div>

      {isAdmin ? (
        <AdminDocumentActions document={document} categories={categories} />
      ) : null}
    </div>
  );
}
