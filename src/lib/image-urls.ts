export function generateImageUrls(options: {
  pattern: string;
  sku: string;
  ean?: string | null;
  count: number;
  start: number;
  extension: string;
}) {
  return Array.from({ length: Math.max(0, options.count) }, (_, index) =>
    options.pattern
      .replaceAll("{sku}", encodeURIComponent(options.sku))
      .replaceAll("{ean}", encodeURIComponent(options.ean ?? ""))
      .replaceAll("{numero}", String(options.start + index))
      .replaceAll("{extensao}", options.extension.replace(/^\./, "")),
  );
}
