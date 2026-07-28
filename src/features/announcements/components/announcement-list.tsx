"use client";

import type { AnnouncementWithImages } from "@/features/announcements/actions";
import { AdminAnnouncementActions } from "@/features/announcements/components/admin-announcement-actions";
import { AdminAnnouncementImages } from "@/features/announcements/components/admin-announcement-images";
import { AnnouncementCoverThumbnail } from "@/features/announcements/components/announcement-cover-thumbnail";
import { AnnouncementGallery } from "@/features/announcements/components/announcement-gallery";
import { HiddenBadge } from "@/features/announcements/components/hidden-badge";
import { PinnedBadge } from "@/features/announcements/components/pinned-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

type AnnouncementListProps = {
  announcements: AnnouncementWithImages[];
  isAdmin: boolean;
};

function formatPublishedAt(value: string): string {
  return new Intl.DateTimeFormat("uk-UA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function AnnouncementCard({
  announcement,
  isAdmin,
}: {
  announcement: AnnouncementWithImages;
  isAdmin: boolean;
}) {
  const galleryImages = announcement.images.slice(1);

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <CardTitle className="text-xl font-bold leading-tight md:text-2xl">
                {announcement.title}
              </CardTitle>

              <div className="flex shrink-0 flex-wrap gap-2">
                {announcement.is_pinned ? <PinnedBadge /> : null}
                {isAdmin && !announcement.is_published ? <HiddenBadge /> : null}
              </div>
            </div>

            <CardDescription>{formatPublishedAt(announcement.created_at)}</CardDescription>

            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
              {announcement.content}
            </p>
          </div>

          <AnnouncementCoverThumbnail
            images={announcement.images}
            className="mx-auto md:ml-0 md:mr-0"
          />
        </div>

        {isAdmin ? (
          <AdminAnnouncementImages
            announcementId={announcement.id}
            images={announcement.images}
          />
        ) : galleryImages.length > 0 ? (
          <AnnouncementGallery images={galleryImages} />
        ) : null}

        {isAdmin ? <AdminAnnouncementActions announcement={announcement} /> : null}
      </CardContent>
    </Card>
  );
}

export function AnnouncementList({ announcements, isAdmin }: AnnouncementListProps) {
  if (announcements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Оголошень поки немає</CardTitle>
          <CardDescription>
            {isAdmin
              ? "Створіть перше оголошення для співробітників."
              : "Нові оголошення з’являться тут."}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {announcements.map((announcement) => (
        <AnnouncementCard
          key={announcement.id}
          announcement={announcement}
          isAdmin={isAdmin}
        />
      ))}
    </div>
  );
}
