export type ShareFileResult = "shared" | "downloaded" | "cancelled";

async function readFetchErrorMessage(response: Response): Promise<string> {
  const fallback = `Failed to fetch file: ${response.status}`;

  try {
    const contentType = response.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const payload = (await response.json()) as { error?: unknown };
      if (typeof payload.error === "string" && payload.error.trim()) {
        return payload.error;
      }
    }
  } catch {
    // Ignore parse failures and keep the fallback status message.
  }

  return fallback;
}

export async function fetchAuthenticatedFileBlob(
  downloadUrl: string,
  signal?: AbortSignal,
): Promise<Blob> {
  const response = await fetch(downloadUrl, {
    credentials: "include",
    signal,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await readFetchErrorMessage(response));
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    throw new Error(await readFetchErrorMessage(response));
  }

  return response.blob();
}

export function createFileFromBlob(blob: Blob, filename: string, mimeType: string): File {
  return new File([blob], filename, {
    type: mimeType || blob.type || "application/octet-stream",
    lastModified: Date.now(),
  });
}

export function downloadFileBlob(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

function isShareCancelled(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export async function shareAuthenticatedFile({
  blob,
  filename,
  mimeType,
}: {
  blob: Blob;
  filename: string;
  mimeType: string;
}): Promise<ShareFileResult> {
  const file = createFileFromBlob(blob, filename, mimeType);

  if (typeof navigator.share === "function" && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: filename,
      });

      return "shared";
    } catch (error) {
      if (isShareCancelled(error)) {
        return "cancelled";
      }

      throw error;
    }
  }

  downloadFileBlob(blob, filename);
  return "downloaded";
}
