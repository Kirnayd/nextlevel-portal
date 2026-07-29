"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useRef } from "react";

import type { AnnouncementWithImages } from "@/features/announcements/actions";
import { markAnnouncementRead } from "@/features/unread/actions";
import { AnnouncementCoverThumbnail } from "@/features/announcements/components/announcement-cover-thumbnail";
import { HiddenBadge } from "@/features/announcements/components/hidden-badge";
import { PinnedBadge } from "@/features/announcements/components/pinned-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

const AdminAnnouncementImages = dynamic(
  () =>
    import("@/features/announcements/components/admin-announcement-images").then(
      (module) => module.AdminAnnouncementImages,
    ),
  { ssr: false, loading: () => null },
);

const AdminAnnouncementActions = dynamic(
  () =>
    import("@/features/announcements/components/admin-announcement-actions").then(
      (module) => module.AdminAnnouncementActions,
    ),
  { ssr: false, loading: () => null },
);

const AnnouncementGallery = dynamic(
  () =>
    import("@/features/announcements/components/announcement-gallery").then(
      (module) => module.AnnouncementGallery,
    ),
  { ssr: false, loading: () => null },
);

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
  const router = useRouter();
  const markedAsReadRef = useRef(false);
  const galleryImages = announcement.images.slice(1);

  async function handleEmployeeOpen() {
    if (isAdmin || markedAsReadRef.current) {
      return;
    }

    markedAsReadRef.current = true;

    const result = await markAnnouncementRead(announcement.id);

    if (result.success) {
      router.refresh();
      return;
    }

    markedAsReadRef.current = false;
  }

  const cardBody = (
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
  );

  if (!isAdmin) {
    return (
      <Card>
        <details
          className="group"
          onToggle={(event) => {
            if (event.currentTarget.open) {
              void handleEmployeeOpen();
            }
          }}
        >
          <summary className="cursor-pointer list-none px-6 pt-6 [&::-webkit-details-marker]:hidden">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <CardTitle className="text-xl font-bold leading-tight md:text-2xl">
                  {announcement.title}
                </CardTitle>
                <CardDescription>{formatPublishedAt(announcement.created_at)}</CardDescription>
              </div>
              <span className="shrink-0 text-sm text-muted-foreground group-open:hidden">
                Розгорнути
              </span>
              <span className="hidden shrink-0 text-sm text-muted-foreground group-open:inline">
                Згорнути
              </span>
            </div>
          </summary>
          {cardBody}
        </details>
      </Card>
    );
  }

  return (
    <Card>
      {cardBody}
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
