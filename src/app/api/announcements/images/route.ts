import { NextResponse } from "next/server";

import { getAnnouncementImageById } from "@/features/announcements/actions";
import { ANNOUNCEMENT_IMAGES_STORAGE_BUCKET } from "@/features/announcements/constants";
import { createClient } from "@/infrastructure/supabase/server";
import { getAuthenticatedUser } from "@/shared/lib/auth";

const MIME_BY_EXTENSION: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function resolveContentType(storagePath: string): string {
  const extension = storagePath.slice(storagePath.lastIndexOf(".")).toLowerCase();

  return MIME_BY_EXTENSION[extension] ?? "application/octet-stream";
}

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const imageId = new URL(request.url).searchParams.get("id");

  if (!imageId) {
    return NextResponse.json({ error: "Image ID is required" }, { status: 400 });
  }

  const image = await getAnnouncementImageById(imageId);

  if (!image) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from(ANNOUNCEMENT_IMAGES_STORAGE_BUCKET)
    .download(image.storage_path);

  if (error || !data) {
    console.error("Failed to download announcement image:", error?.message);
    return NextResponse.json({ error: "Failed to download image" }, { status: 500 });
  }

  return new NextResponse(data, {
    headers: {
      "Content-Type": resolveContentType(image.storage_path),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
