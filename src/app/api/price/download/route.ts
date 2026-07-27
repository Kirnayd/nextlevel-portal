import { NextResponse } from "next/server";

import { getCurrentPriceFile } from "@/features/price/actions";
import { PRICE_STORAGE_BUCKET } from "@/features/price/constants";
import { createClient } from "@/infrastructure/supabase/server";
import { getAuthenticatedUser } from "@/shared/lib/auth";

export async function GET() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const priceFile = await getCurrentPriceFile();

  if (!priceFile) {
    return NextResponse.json({ error: "Price file not found" }, { status: 404 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from(PRICE_STORAGE_BUCKET)
    .download(priceFile.storage_path);

  if (error || !data) {
    console.error("Failed to download price file:", error?.message);
    return NextResponse.json({ error: "Failed to download file" }, { status: 500 });
  }

  const encodedFilename = encodeURIComponent(priceFile.original_filename);

  const safeFilename = priceFile.original_filename
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/["\\]/g, "_");
  
  return new NextResponse(data, {
    headers: {
      "Content-Type": priceFile.mime_type,
      "Content-Disposition": `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`,
    },
  });
}
