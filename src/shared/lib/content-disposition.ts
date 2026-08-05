export function buildContentDisposition(
  originalFilename: string,
  disposition: "inline" | "attachment",
): string {
  const encodedFilename = encodeURIComponent(originalFilename);
  const lastDot = originalFilename.lastIndexOf(".");
  const extension = lastDot > 0 ? originalFilename.slice(lastDot).toLowerCase() : "";
  const safeBase =
    (lastDot > 0 ? originalFilename.slice(0, lastDot) : originalFilename)
      .replace(/[^\x20-\x7E]/g, "_")
      .replace(/["\\]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^[_\-.]+|[_\-.]+$/g, "") || "document";
  const safeFilename = `${safeBase}${extension}`;

  return `${disposition}; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`;
}
