"use client";

import { useEffect, useState } from "react";

import {
  parsePptxPresentation,
  revokePresentationUrls,
  type PresentationData,
} from "@/shared/lib/parse-pptx";
import { Button } from "@/shared/components/ui/button";

export type PresentationViewerProps = {
  fileBlob: Blob;
  onStatusChange?: (status: {
    phase: "loading" | "ready" | "error" | "fallback";
    slideIndicator?: string;
    message?: string;
  }) => void;
  onLoadError?: (message: string) => void;
  onFallback?: () => void;
};

export function PresentationViewer({
  fileBlob,
  onStatusChange,
  onLoadError,
  onFallback,
}: PresentationViewerProps) {
  const [phase, setPhase] = useState<"loading" | "ready" | "error" | "fallback">("loading");
  const [presentation, setPresentation] = useState<PresentationData | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  const activeSlide = presentation?.slides[activeSlideIndex] ?? null;
  const slideIndicator =
    presentation && presentation.slides.length > 0
      ? `Слайд ${activeSlideIndex + 1} з ${presentation.slides.length}`
      : undefined;

  useEffect(() => {
    onStatusChange?.({ phase, slideIndicator });
  }, [onStatusChange, phase, slideIndicator]);

  useEffect(() => {
    let cancelled = false;

    async function loadPresentation() {
      setPhase("loading");

      try {
        const buffer = await fileBlob.arrayBuffer();
        const parsed = await parsePptxPresentation(buffer);

        if (cancelled) {
          revokePresentationUrls(parsed);
          return;
        }

        if (parsed.slides.length === 0) {
          revokePresentationUrls(parsed);
          setPhase("fallback");
          onFallback?.();
          return;
        }

        setPresentation(parsed);
        setActiveSlideIndex(0);
        setPhase("ready");
      } catch (error) {
        if (cancelled) {
          return;
        }

        const message = error instanceof Error ? error.message : "Unknown parse error";
        console.error("PPTX parse error:", message);
        onLoadError?.(message);
        setPhase("fallback");
        onFallback?.();
      }
    }

    void loadPresentation();

    return () => {
      cancelled = true;
      setPresentation((current) => {
        revokePresentationUrls(current);
        return null;
      });
    };
  }, [fileBlob, onFallback, onLoadError]);

  if (phase === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Завантаження презентації...
      </div>
    );
  }

  if (phase === "fallback" || phase === "error" || !activeSlide || !presentation) {
    return null;
  }

  const slideCount = presentation.slides.length;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{slideIndicator}</p>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={activeSlideIndex <= 0}
            onClick={() => setActiveSlideIndex((current) => Math.max(0, current - 1))}
          >
            Попередній
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={activeSlideIndex >= slideCount - 1}
            onClick={() =>
              setActiveSlideIndex((current) => Math.min(slideCount - 1, current + 1))
            }
          >
            Наступний
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-md border bg-background p-4">
        <div className="mx-auto flex min-h-[50dvh] w-full max-w-4xl flex-col gap-4 rounded-lg border bg-card p-6 shadow-sm">
          {activeSlide.imageUrls.map((imageUrl) => (
            // eslint-disable-next-line @next/next/no-img-element -- blob URLs from private PPTX media
            <img
              key={imageUrl}
              src={imageUrl}
              alt=""
              className="max-h-[40dvh] w-full object-contain"
            />
          ))}

          {activeSlide.texts.length > 0 ? (
            <div className="space-y-3">
              {activeSlide.texts.map((text, index) => (
                <p key={`${activeSlide.index}-${index}`} className="text-sm leading-relaxed">
                  {text}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">На цьому слайді немає тексту.</p>
          )}
        </div>
      </div>
    </div>
  );
}
