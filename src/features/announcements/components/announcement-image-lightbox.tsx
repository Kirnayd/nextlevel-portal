"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import type { AnnouncementImage } from "@/features/announcements/actions";
import { getAnnouncementImageUrl } from "@/features/announcements/constants";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

type AnnouncementImageLightboxProps = {
  images: AnnouncementImage[];
  initialIndex: number;
  onClose: () => void;
};

export function AnnouncementImageLightbox({
  images,
  initialIndex,
  onClose,
}: AnnouncementImageLightboxProps) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const activeImage = images[activeIndex];

  useEffect(() => {
    setActiveIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }

      if (event.key === "ArrowLeft") {
        setActiveIndex((current) => (current > 0 ? current - 1 : current));
      }

      if (event.key === "ArrowRight") {
        setActiveIndex((current) => (current < images.length - 1 ? current + 1 : current));
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [images.length, onClose]);

  function showPrevious() {
    setActiveIndex((current) => (current > 0 ? current - 1 : current));
  }

  function showNext() {
    setActiveIndex((current) => (current < images.length - 1 ? current + 1 : current));
  }

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    setTouchStartX(event.changedTouches[0]?.clientX ?? null);
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    if (touchStartX === null) {
      return;
    }

    const touchEndX = event.changedTouches[0]?.clientX ?? touchStartX;
    const delta = touchEndX - touchStartX;

    if (Math.abs(delta) >= 40) {
      if (delta > 0) {
        showPrevious();
      } else {
        showNext();
      }
    }

    setTouchStartX(null);
  }

  if (!activeImage) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]"
      role="dialog"
      aria-modal="true"
      aria-label="Перегляд зображення"
      onClick={onClose}
    >
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="absolute right-[max(1rem,env(safe-area-inset-right))] top-[max(1rem,env(safe-area-inset-top))] z-10 border-white/20 bg-black/40 text-white hover:bg-black/60"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
      >
        <X />
      </Button>

      {images.length > 1 ? (
        <>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={cn(
              "absolute left-4 top-1/2 z-10 -translate-y-1/2 border-white/20 bg-black/40 text-white hover:bg-black/60",
              activeIndex === 0 && "opacity-50",
            )}
            disabled={activeIndex === 0}
            onClick={(event) => {
              event.stopPropagation();
              showPrevious();
            }}
          >
            <ChevronLeft />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className={cn(
              "absolute right-4 top-1/2 z-10 -translate-y-1/2 border-white/20 bg-black/40 text-white hover:bg-black/60",
              activeIndex === images.length - 1 && "opacity-50",
            )}
            disabled={activeIndex === images.length - 1}
            onClick={(event) => {
              event.stopPropagation();
              showNext();
            }}
          >
            <ChevronRight />
          </Button>
        </>
      ) : null}

      <div
        className="flex max-h-full max-w-full flex-col items-center gap-3"
        onClick={(event) => event.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={getAnnouncementImageUrl(activeImage.id)}
          alt=""
          className="max-h-[80vh] max-w-full object-contain"
        />
        {images.length > 1 ? (
          <p className="text-sm text-white/80">
            {activeIndex + 1} / {images.length}
          </p>
        ) : null}
      </div>
    </div>
  );
}
