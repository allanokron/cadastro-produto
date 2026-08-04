export function asText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/^\uFEFF/, "");
}

export function normalizeSku(value: unknown): string {
  return asText(value).normalize("NFKC").trim().replace(/\s+/g, " ").toUpperCase();
}

export function normalizeEan(value: unknown): string {
  return asText(value).normalize("NFKC").trim().replace(/[\s.-]/g, "");
}

export function parseDecimal(value: unknown): number | null {
  const text = asText(value).trim();
  if (!text) return null;
  const normalized = text.includes(",")
    ? text.replace(/\./g, "").replace(",", ".")
    : text;
  const result = Number(normalized);
  return Number.isFinite(result) ? result : null;
}
