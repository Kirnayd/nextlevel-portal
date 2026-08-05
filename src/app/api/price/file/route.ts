import { NextResponse } from "next/server";

import { getCurrentPriceFile } from "@/features/price/actions";
import { PRICE_STORAGE_BUCKET } from "@/features/price/constants";
import { createClient } from "@/infrastructure/supabase/server";
import { getAuthenticatedUser } from "@/shared/lib/auth";
import { buildContentDisposition } from "@/shared/lib/content-disposition";
import { isPdfMimeType } from "@/shared/lib/file-types";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function isMissingStorageObject(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const storageError = error as {
    message?: string;
    statusCode?: string | number;
    status?: string | number;
  };

  const statusCode = String(storageError.statusCode ?? storageError.status ?? "");
  const message = (storageError.message ?? "").toLowerCase();

  return (
    statusCode === "404" ||
    message.includes("not found") ||
    message.includes("object not found") ||
    message.includes("does not exist")
  );
}

export async function GET(request: Request) {
  const route = "/api/price/file";

  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      console.error("[price-file]", {
        route,
        metadataFound: false,
        status: 401,
        reason: "unauthenticated",
      });
      return jsonError("Увійдіть у систему, щоб відкрити прайс.", 401);
    }

    const priceFile = await getCurrentPriceFile();

    if (!priceFile) {
      console.error("[price-file]", {
        route,
        userId: user.id,
        metadataFound: false,
        status: 404,
        reason: "price_metadata_missing",
      });
      return jsonError("Поточний прайс не знайдено.", 404);
    }

    if (
      !priceFile.storage_path ||
      typeof priceFile.storage_path !== "string" ||
      !priceFile.storage_path.trim() ||
      !priceFile.original_filename ||
      !priceFile.mime_type
    ) {
      console.error("[price-file]", {
        route,
        userId: user.id,
        metadataFound: true,
        fileId: priceFile.id,
        bucket: PRICE_STORAGE_BUCKET,
        status: 400,
        reason: "invalid_price_metadata",
      });
      return jsonError("Метадані прайсу пошкоджені. Завантажте прайс ще раз.", 400);
    }

    const supabase = await createClient();
    const { data, error } = await supabase.storage
      .from(PRICE_STORAGE_BUCKET)
      .download(priceFile.storage_path);

    if (error || !data) {
      const missing = isMissingStorageObject(error);
      const status = missing ? 404 : 500;
      const storageError =
        error && typeof error === "object"
          ? (error as {
              message?: string;
              statusCode?: string | number;
              status?: string | number;
            })
          : null;

      console.error("[price-file]", {
        route,
        userId: user.id,
        metadataFound: true,
        fileId: priceFile.id,
        bucket: PRICE_STORAGE_BUCKET,
        storageErrorCode: storageError?.statusCode ?? storageError?.status ?? null,
        storageErrorMessage: storageError?.message ?? "empty_storage_response",
        status,
        reason: missing ? "storage_object_missing" : "storage_download_failed",
      });

      if (missing) {
        return jsonError(
          "Файл прайсу відсутній у сховищі. Завантажте прайс ще раз.",
          404,
        );
      }

      return jsonError("Не вдалося завантажити файл прайсу.", 500);
    }

    const dispositionParam = new URL(request.url).searchParams.get("disposition");
    const disposition =
      dispositionParam === "attachment"
        ? "attachment"
        : dispositionParam === "inline"
          ? "inline"
          : isPdfMimeType(priceFile.mime_type)
            ? "inline"
            : "attachment";

    const headers = new Headers({
      "Content-Type": priceFile.mime_type,
      "Content-Disposition": buildContentDisposition(
        priceFile.original_filename,
        disposition,
      ),
      "Cache-Control": "private, no-store",
    });

    if (typeof priceFile.size_bytes === "number" && priceFile.size_bytes > 0) {
      headers.set("Content-Length", String(priceFile.size_bytes));
    }

    return new NextResponse(data, { status: 200, headers });
  } catch (error) {
    console.error("[price-file]", {
      route,
      metadataFound: false,
      status: 500,
      reason: "unexpected_error",
      message: error instanceof Error ? error.message : "unknown",
    });
    return jsonError("Сталася помилка під час відкриття прайсу.", 500);
  }
}
