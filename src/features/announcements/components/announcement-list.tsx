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
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <AnnouncementCoverThumbnail images={announcement.images} />

          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <CardTitle className="text-lg">{announcement.title}</CardTitle>
                <CardDescription>{formatPublishedAt(announcement.created_at)}</CardDescription>
              </div>

              <div className="flex flex-wrap gap-2">
                {announcement.is_pinned ? <PinnedBadge /> : null}
                {isAdmin && !announcement.is_published ? <HiddenBadge /> : null}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{announcement.content}</p>

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
