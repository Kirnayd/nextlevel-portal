export type ShareFileResult = "shared" | "downloaded" | "cancelled";

export async function fetchAuthenticatedFileBlob(
  downloadUrl: string,
  signal?: AbortSignal,
): Promise<Blob> {
  const response = await fetch(downloadUrl, {
    credentials: "include",
    signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.status}`);
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
