"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { markPriceRead } from "@/features/unread/actions";

type PriceReadTrackerProps = {
  fileId: string;
};

export function PriceReadTracker({ fileId }: PriceReadTrackerProps) {
  const router = useRouter();
  const markedFileIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!fileId || markedFileIdRef.current === fileId) {
      return;
    }

    markedFileIdRef.current = fileId;

    void markPriceRead(fileId).then((result) => {
      if (result.success) {
        router.refresh();
      } else {
        markedFileIdRef.current = null;
      }
    });
  }, [fileId, router]);

  return null;
}
