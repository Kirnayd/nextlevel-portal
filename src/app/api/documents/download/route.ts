import { NextResponse } from "next/server";

import { getDocumentById } from "@/features/documents/actions";
import { DOCUMENTS_STORAGE_BUCKET } from "@/features/documents/constants";
import { buildContentDisposition } from "@/features/documents/lib/format";
import { createClient } from "@/infrastructure/supabase/server";
import { getAuthenticatedUser } from "@/shared/lib/auth";

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const documentId = new URL(request.url).searchParams.get("id");

  if (!documentId) {
    return NextResponse.json({ error: "Document ID is required" }, { status: 400 });
  }

  const document = await getDocumentById(documentId);

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from(DOCUMENTS_STORAGE_BUCKET)
    .download(document.storage_path);

  if (error || !data) {
    console.error("Failed to download document:", error?.message);
    return NextResponse.json({ error: "Failed to download file" }, { status: 500 });
  }

  const isPdf = document.mime_type === "application/pdf";
  const disposition = buildContentDisposition(
    document.original_filename,
    isPdf ? "inline" : "attachment",
  );

  return new NextResponse(data, {
    headers: {
      "Content-Type": document.mime_type,
      "Content-Disposition": disposition,
    },
  });
}
