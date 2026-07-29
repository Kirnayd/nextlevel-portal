"use client";

import dynamic from "next/dynamic";
import { ExternalLink } from "lucide-react";

import type { PriceFile } from "@/features/price/actions";
import { FileOpenTrigger } from "@/shared/components/file-viewer/file-open-trigger";
import { isExcelMimeType, isPdfMimeType } from "@/shared/lib/file-types";

const PriceDownloadActions = dynamic(
  () =>
    import("@/features/price/components/price-download-actions").then(
      (module) => module.PriceDownloadActions,
    ),
  { ssr: false, loading: () => null },
);

type PriceFileActionsProps = {
  priceFile: PriceFile;
};

export function PriceFileActions({ priceFile }: PriceFileActionsProps) {
  const isExcel = isExcelMimeType(priceFile.mime_type);
  const isPdf = isPdfMimeType(priceFile.mime_type);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {isExcel ? (
          <FileOpenTrigger
            downloadUrl="/api/price/download"
            filename={priceFile.original_filename}
            mimeType={priceFile.mime_type}
            fileTypeLabel="Excel"
            sizeBytes={priceFile.size_bytes}
            label="Переглянути прайс"
            icon={<ExternalLink />}
            searchPlaceholder="Пошук у прайсі"
            loadingLabel="Завантаження прайсу..."
          />
        ) : null}

        {isPdf ? (
          <FileOpenTrigger
            downloadUrl="/api/price/download"
            filename={priceFile.original_filename}
            mimeType={priceFile.mime_type}
            fileTypeLabel="PDF"
            sizeBytes={priceFile.size_bytes}
            label="Відкрити PDF"
            icon={<ExternalLink />}
          />
        ) : null}

        <PriceDownloadActions priceFile={priceFile} />
      </div>
    </div>
  );
}
