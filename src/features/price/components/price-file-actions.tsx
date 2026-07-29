"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Download, ExternalLink, Share2 } from "lucide-react";

import type { PriceFile } from "@/features/price/actions";
import { FileOpenTrigger } from "@/shared/components/file-viewer/file-open-trigger";
import { Button } from "@/shared/components/ui/button";
import { isExcelMimeType, isPdfMimeType } from "@/shared/lib/file-types";
import {
  downloadFileBlob,
  fetchAuthenticatedFileBlob,
  shareAuthenticatedFile,
} from "@/shared/lib/share-file";

const ExcelPriceViewer = dynamic(
  () =>
    import("@/features/price/components/excel-price-viewer").then(
      (module) => module.ExcelPriceViewer,
    ),
  { ssr: false, loading: () => null },
);

type PriceFileActionsProps = {
  priceFile: PriceFile;
};

export function PriceFileActions({ priceFile }: PriceFileActionsProps) {
  const [shareError, setShareError] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isExcelViewerOpen, setIsExcelViewerOpen] = useState(false);

  const isExcel = isExcelMimeType(priceFile.mime_type);
  const isPdf = isPdfMimeType(priceFile.mime_type);

  async function handleDownload() {
    setIsDownloading(true);

    try {
      const blob = await fetchAuthenticatedFileBlob("/api/price/download");
      downloadFileBlob(blob, priceFile.original_filename);
    } catch (error) {
      console.error("Failed to download price file:", error);
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleShare() {
    setShareError("");
    setIsSharing(true);

    try {
      const blob = await fetchAuthenticatedFileBlob("/api/price/download");
      await shareAuthenticatedFile({
        blob,
        filename: priceFile.original_filename,
        mimeType: priceFile.mime_type,
      });
    } catch (error) {
      console.error("Failed to share price file:", error);
      setShareError("Не вдалося поділитися файлом.");
    } finally {
      setIsSharing(false);
    }
  }

  const downloadLabel = isExcel ? "Завантажити Excel" : "Завантажити PDF";
  const shareLabel = isExcel ? "Поділитися Excel" : "Поділитися PDF";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {isExcel ? (
          <Button type="button" onClick={() => setIsExcelViewerOpen(true)}>
            <ExternalLink />
            Переглянути прайс
          </Button>
        ) : null}

        {isPdf ? (
          <FileOpenTrigger
            downloadUrl="/api/price/download"
            filename={priceFile.original_filename}
            mimeType={priceFile.mime_type}
            fileTypeLabel="PDF"
            label="Відкрити PDF"
            icon={<ExternalLink />}
          />
        ) : null}

        <Button
          type="button"
          variant="outline"
          disabled={isDownloading}
          onClick={() => void handleDownload()}
        >
          <Download />
          {isDownloading ? "Завантаження…" : downloadLabel}
        </Button>

        <Button type="button" variant="outline" disabled={isSharing} onClick={() => void handleShare()}>
          <Share2 />
          {isSharing ? "Поділитися…" : shareLabel}
        </Button>
      </div>

      {shareError ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {shareError}
        </div>
      ) : null}

      {isExcel && isExcelViewerOpen ? (
        <ExcelPriceViewer
          open={isExcelViewerOpen}
          onClose={() => setIsExcelViewerOpen(false)}
          downloadUrl="/api/price/download"
          filename={priceFile.original_filename}
          mimeType={priceFile.mime_type}
        />
      ) : null}
    </div>
  );
}
