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

export function extractImageUrls(data:unknown){
  if(!data||typeof data!=="object")return [];
  const urls:string[]=[];
  for(const [key,value] of Object.entries(data as Record<string,unknown>)){
    if(!/(imagem|image|img|foto|url)/i.test(key)||typeof value!=="string")continue;
    urls.push(...(value.match(/https?:\/\/[^\s,;|"']+/gi)??[]));
  }
  return [...new Set(urls)];
}
