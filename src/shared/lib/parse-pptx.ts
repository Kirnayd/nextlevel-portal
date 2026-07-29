export type PresentationSlide = {
  index: number;
  texts: string[];
  imageUrls: string[];
};

export type PresentationData = {
  slides: PresentationSlide[];
};

function extractTextFromSlideXml(xml: string): string[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "application/xml");
  const textNodes = doc.getElementsByTagName("a:t");
  const texts: string[] = [];

  for (let index = 0; index < textNodes.length; index += 1) {
    const value = textNodes[index]?.textContent?.trim();

    if (value) {
      texts.push(value);
    }
  }

  return texts;
}

function parseSlideNumber(path: string): number {
  const match = path.match(/slide(\d+)\.xml$/i);
  return match ? Number(match[1]) : 0;
}

async function loadSlideImages(
  zip: import("jszip"),
  slidePath: string,
  relsPath: string,
): Promise<string[]> {
  const relsFile = zip.file(relsPath);

  if (!relsFile) {
    return [];
  }

  const relsXml = await relsFile.async("text");
  const parser = new DOMParser();
  const relsDoc = parser.parseFromString(relsXml, "application/xml");
  const relationships = relsDoc.getElementsByTagName("Relationship");
  const imageUrls: string[] = [];
  const slideDir = slidePath.slice(0, slidePath.lastIndexOf("/") + 1);

  for (let index = 0; index < relationships.length; index += 1) {
    const relationship = relationships[index];
    const type = relationship?.getAttribute("Type") ?? "";
    const target = relationship?.getAttribute("Target");

    if (!target || !type.endsWith("/image")) {
      continue;
    }

    const mediaPath = target.startsWith("../")
      ? `ppt/${target.replace(/^\.\.\//, "")}`
      : `${slideDir}${target}`;
    const mediaFile = zip.file(mediaPath);

    if (!mediaFile) {
      continue;
    }

    const blob = await mediaFile.async("blob");
    imageUrls.push(URL.createObjectURL(blob));
  }

  return imageUrls;
}

export async function parsePptxPresentation(buffer: ArrayBuffer): Promise<PresentationData> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(buffer);

  const slidePaths = Object.keys(zip.files)
    .filter((path) => /^ppt\/slides\/slide\d+\.xml$/i.test(path))
    .sort((left, right) => parseSlideNumber(left) - parseSlideNumber(right));

  const slides: PresentationSlide[] = [];

  for (const slidePath of slidePaths) {
    const slideFile = zip.file(slidePath);

    if (!slideFile) {
      continue;
    }

    const xml = await slideFile.async("text");
    const slideNumber = parseSlideNumber(slidePath);
    const relsPath = `ppt/slides/_rels/slide${slideNumber}.xml.rels`;
    const texts = extractTextFromSlideXml(xml);
    const imageUrls = await loadSlideImages(zip, slidePath, relsPath);

    slides.push({
      index: slideNumber,
      texts,
      imageUrls,
    });
  }

  return { slides };
}

export function revokePresentationUrls(presentation: PresentationData | null): void {
  if (!presentation) {
    return;
  }

  for (const slide of presentation.slides) {
    for (const imageUrl of slide.imageUrls) {
      URL.revokeObjectURL(imageUrl);
    }
  }
}
