import Image from "next/image";

import type { AnnouncementImage } from "@/features/announcements/actions";
import { getAnnouncementImageUrl } from "@/features/announcements/constants";
import { AnnouncementImagePlaceholder } from "@/features/announcements/components/announcement-image-placeholder";
import { cn } from "@/shared/lib/utils";

type AnnouncementCoverThumbnailProps = {
  images: AnnouncementImage[];
  className?: string;
};

export function AnnouncementCoverThumbnail({ images, className }: AnnouncementCoverThumbnailProps) {
  const coverImage = images[0];

  if (!coverImage) {
    return (
      <AnnouncementImagePlaceholder
        className={cn("aspect-auto h-[160px] w-full max-w-[220px] shrink-0", className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "relative h-[160px] w-full max-w-[220px] shrink-0 overflow-hidden rounded-lg border",
        className,
      )}
    >
      <Image
        src={getAnnouncementImageUrl(coverImage.id)}
        alt=""
        fill
        sizes="220px"
        className="object-cover"
        loading="lazy"
        unoptimized
      />
    </div>
  );
}
