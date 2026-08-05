export type PromoItem = {
  skuKey: string;
  sku: string;
  name: string;
  stock: string | null;
  firstImageUrl: string | null;
  promoPrice: string;
  minQty: string;
};

export type VendorConfig = {
  logoDataUrl: string;
  whatsapp: string;
  phone: string;
  message: string;
  businessName: string;
};

function escapeHtml(str: string) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatCurrency(value: string) {
  const num = parseFloat(value.replace(",", "."));
  if (isNaN(num)) return value;
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function headerHtml(config: VendorConfig) {
  const logo = config.logoDataUrl
    ? `<img src="${config.logoDataUrl}" style="height:60px;object-contain;" crossorigin="anonymous" />`
    : "";
  const contactLines: string[] = [];
  if (config.businessName) contactLines.push(`<strong style="font-size:16px;color:#14181f;">${escapeHtml(config.businessName)}</strong>`);
  if (config.whatsapp) contactLines.push(`<span style="font-size:13px;color:#555;">WhatsApp: ${escapeHtml(config.whatsapp)}</span>`);
  if (config.phone) contactLines.push(`<span style="font-size:13px;color:#555;">Tel: ${escapeHtml(config.phone)}</span>`);
  const contactHtml = contactLines.join("<br/>");

  return `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 24px;border-bottom:3px solid #1fadad;">
      <div style="display:flex;align-items:center;gap:16px;">
        ${logo}
        <div>${contactHtml}</div>
      </div>
      ${config.message ? `<div style="font-size:13px;color:#1fadad;font-weight:700;text-align:right;max-width:300px;">${escapeHtml(config.message)}</div>` : ""}
    </div>`;
}

function productCardHtml(item: PromoItem) {
  const img = item.firstImageUrl
    ? `<img src="${escapeHtml(item.firstImageUrl)}" style="width:100%;height:140px;object-fit:contain;background:#f9fafb;border-radius:8px 8px 0 0;" crossorigin="anonymous" referrerpolicy="no-referrer" />`
    : `<div style="width:100%;height:140px;background:#f3f4f6;border-radius:8px 8px 0 0;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:13px;">Sem imagem</div>`;
  const price = formatCurrency(item.promoPrice);
  const minQty = item.minQty ? `<div style="font-size:12px;color:#666;margin-top:2px;">Mín: ${escapeHtml(item.minQty)} un</div>` : "";
  const stock = item.stock ? `<div style="font-size:11px;color:#999;margin-top:2px;">Estoque: ${escapeHtml(item.stock)}</div>` : "";

  return `
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;display:flex;flex-direction:column;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
      ${img}
      <div style="padding:10px 12px;display:flex;flex-direction:column;">
        <div style="font-size:10px;color:#999;font-weight:600;letter-spacing:0.03em;flex-shrink:0;">${escapeHtml(item.sku)}</div>
        <div style="font-size:13px;font-weight:700;color:#14181f;line-height:1.4;margin-top:2px;flex-shrink:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div>
        <div style="margin-top:6px;">
          <div style="font-size:20px;font-weight:900;color:#1fadad;">${price}</div>
          ${minQty}
          ${stock}
        </div>
      </div>
    </div>`;
}

export function buildA4Page(items: PromoItem[], config: VendorConfig) {
  const cards = items.map(productCardHtml).join("");
  return `
    <div style="width:794px;height:1123px;background:#fff;font-family:system-ui,-apple-system,sans-serif;overflow:hidden;display:flex;flex-direction:column;">
      ${headerHtml(config)}
      <div style="flex:1;padding:20px 24px;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr 1fr;gap:16px;">
        ${cards}
      </div>
    </div>`;
}

export function buildA4Html(pages: PromoItem[][], config: VendorConfig) {
  return pages.map((page) => buildA4Page(page, config)).join("");
}

export function buildInstagramHtml(items: PromoItem[], config: VendorConfig) {
  const cards = items.map(productCardHtml).join("");
  return `
    <div style="width:1080px;height:1080px;background:#fff;font-family:system-ui,-apple-system,sans-serif;overflow:hidden;display:flex;flex-direction:column;">
      ${headerHtml(config)}
      <div style="flex:1;padding:24px;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:20px;">
        ${cards}
      </div>
    </div>`;
}

export function chunkItems(items: PromoItem[], perPage: number): PromoItem[][] {
  const chunks: PromoItem[][] = [];
  for (let i = 0; i < items.length; i += perPage) {
    chunks.push(items.slice(i, i + perPage));
  }
  return chunks;
}
