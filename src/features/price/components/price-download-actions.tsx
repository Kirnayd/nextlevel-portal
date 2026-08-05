"use client";

import { useState } from "react";
import { Download, Share2 } from "lucide-react";

import type { PriceFile } from "@/features/price/actions";
import { Button } from "@/shared/components/ui/button";
import { isExcelMimeType, isPdfMimeType } from "@/shared/lib/file-types";
import {
  downloadFileBlob,
  fetchAuthenticatedFileBlob,
  shareAuthenticatedFile,
} from "@/shared/lib/share-file";

type PriceDownloadActionsProps = {
  priceFile: PriceFile;
};

export function PriceDownloadActions({ priceFile }: PriceDownloadActionsProps) {
  const [shareError, setShareError] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const isExcel = isExcelMimeType(priceFile.mime_type);
  const downloadLabel = isExcel ? "Завантажити Excel" : "Завантажити PDF";
  const shareLabel = isExcel ? "Поділитися Excel" : "Поділитися PDF";

  async function handleDownload() {
    setIsDownloading(true);

    try {
      const blob = await fetchAuthenticatedFileBlob("/api/price/file?disposition=attachment");
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
      const blob = await fetchAuthenticatedFileBlob("/api/price/file?disposition=attachment");
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

  if (!isExcel && !isPdfMimeType(priceFile.mime_type)) {
    return null;
  }

  return (
    <>
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

      {shareError ? (
        <div
          role="alert"
          className="w-full rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {shareError}
        </div>
      ) : null}
    </>
  );
}
