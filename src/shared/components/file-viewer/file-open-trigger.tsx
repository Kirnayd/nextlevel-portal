"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

const FileViewer = dynamic(
  () => import("@/shared/components/file-viewer/file-viewer").then((module) => module.FileViewer),
  { ssr: false, loading: () => null },
);

type FileOpenTriggerProps = {
  downloadUrl: string;
  filename: string;
  mimeType: string;
  fileTypeLabel: string;
  sizeBytes?: number | null;
  label: string;
  icon?: ReactNode;
  variant?: "default" | "outline" | "destructive" | "secondary" | "ghost" | "link";
  className?: string;
  searchPlaceholder?: string;
  loadingLabel?: string;
};

export function FileOpenTrigger({
  downloadUrl,
  filename,
  mimeType,
  fileTypeLabel,
  sizeBytes,
  label,
  icon,
  variant = "default",
  className,
  searchPlaceholder,
  loadingLabel,
}: FileOpenTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        className={cn("shrink-0", className)}
        onClick={() => setIsOpen(true)}
      >
        {icon}
        {label}
      </Button>

      {isOpen ? (
        <FileViewer
          open={isOpen}
          onClose={handleClose}
          downloadUrl={downloadUrl}
          filename={filename}
          mimeType={mimeType}
          fileTypeLabel={fileTypeLabel}
          sizeBytes={sizeBytes}
          searchPlaceholder={searchPlaceholder}
          loadingLabel={loadingLabel}
        />
      ) : null}
    </>
  );
}
