import { Download, ExternalLink, FileSpreadsheet } from "lucide-react";

import type { PriceFile } from "@/features/price/actions";
import { PRICE_MIME_TYPE_LABELS } from "@/features/price/constants";
import { FileOpenTrigger } from "@/shared/components/file-viewer/file-open-trigger";
import { isPdfMimeType } from "@/shared/lib/file-types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

type PriceViewProps = {
  priceFile: PriceFile | null;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUploadedAt(value: string): string {
  return new Intl.DateTimeFormat("uk-UA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function PriceView({ priceFile }: PriceViewProps) {
  if (!priceFile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Поточний прайс</CardTitle>
          <CardDescription>Файл прайсу ще не завантажено.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const fileTypeLabel =
    PRICE_MIME_TYPE_LABELS[
      priceFile.mime_type as keyof typeof PRICE_MIME_TYPE_LABELS
    ] ?? "Файл";
  const isPdf = isPdfMimeType(priceFile.mime_type);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Поточний прайс</CardTitle>
        <CardDescription>
          Актуальний файл прайсу для перегляду та завантаження.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4">
          <FileSpreadsheet className="mt-0.5 size-5 shrink-0 text-primary" />
          <div className="min-w-0 space-y-1">
            <p className="truncate font-medium">{priceFile.original_filename}</p>
            <p className="text-sm text-muted-foreground">
              {fileTypeLabel} · {formatFileSize(priceFile.size_bytes)}
            </p>
            <p className="text-sm text-muted-foreground">
              Оновлено: {formatUploadedAt(priceFile.updated_at)}
            </p>
          </div>
        </div>

        <FileOpenTrigger
          downloadUrl="/api/price/download"
          filename={priceFile.original_filename}
          mimeType={priceFile.mime_type}
          fileTypeLabel={fileTypeLabel}
          sizeBytes={priceFile.size_bytes}
          label={isPdf ? "Відкрити PDF" : "Відкрити файл"}
          icon={isPdf ? <ExternalLink /> : <Download />}
        />
      </CardContent>
    </Card>
  );
}
