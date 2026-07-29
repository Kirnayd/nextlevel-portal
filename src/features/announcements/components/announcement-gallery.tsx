"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

import type { AnnouncementImage } from "@/features/announcements/actions";
import { AnnouncementImagePlaceholder } from "@/features/announcements/components/announcement-image-placeholder";
import { getAnnouncementImageUrl } from "@/features/announcements/constants";

const AnnouncementImageLightbox = dynamic(
  () =>
    import("@/features/announcements/components/announcement-image-lightbox").then(
      (module) => module.AnnouncementImageLightbox,
    ),
  { ssr: false },
);

type AnnouncementGalleryProps = {
  images: AnnouncementImage[];
};

export function AnnouncementGallery({ images }: AnnouncementGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (images.length === 0) {
    return <AnnouncementImagePlaceholder />;
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {images.map((image, index) => (
          <button
            key={image.id}
            type="button"
            className="group relative aspect-[4/3] overflow-hidden rounded-lg border bg-muted/20"
            onClick={() => setActiveIndex(index)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getAnnouncementImageUrl(image.id)}
              alt=""
              className="size-full object-cover transition-transform group-hover:scale-[1.02]"
              loading="lazy"
            />
          </button>
        ))}
      </div>

      {activeIndex !== null ? (
        <AnnouncementImageLightbox
          images={images}
          initialIndex={activeIndex}
          onClose={() => setActiveIndex(null)}
        />
      ) : null}
    </>
  );
}
