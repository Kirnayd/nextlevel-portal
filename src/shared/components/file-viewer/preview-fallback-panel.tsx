"use client";

import { FileText } from "lucide-react";

import { formatFileSize } from "@/shared/lib/file-types";

type PreviewFallbackPanelProps = {
  filename: string;
  fileTypeLabel: string;
  sizeBytes?: number | null;
  message: string;
};

export function PreviewFallbackPanel({
  filename,
  fileTypeLabel,
  sizeBytes,
  message,
}: PreviewFallbackPanelProps) {
  const formattedSize = formatFileSize(sizeBytes);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 py-8">
      <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4">
        <FileText className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="min-w-0 space-y-1">
          <p className="break-words font-medium">{filename}</p>
          <p className="text-sm text-muted-foreground">{fileTypeLabel}</p>
          {formattedSize ? <p className="text-sm text-muted-foreground">{formattedSize}</p> : null}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
