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
    return <AnnouncementImagePlaceholder className={cn("max-w-[160px]", className)} />;
  }

  return (
    <div className={cn("relative aspect-[4/3] w-full max-w-[160px] overflow-hidden rounded-lg border", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={getAnnouncementImageUrl(coverImage.id)}
        alt=""
        className="size-full object-cover"
        loading="lazy"
      />
    </div>
  );
}
