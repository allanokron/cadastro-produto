import { parse } from "csv-parse/sync";
import { asText, normalizeEan, normalizeSku } from "./normalization";

export function parseGoogleSheetUrl(url: string) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.hostname !== "docs.google.com") {
    throw new Error("Use um link público válido do Google Sheets.");
  }
  const match = parsed.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) throw new Error("Não foi possível identificar a planilha.");
  return match[1];
}

export function buildCsvUrl(url: string, sheetName: string) {
  const id = parseGoogleSheetUrl(url);
  return `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&headers=1&sheet=${encodeURIComponent(sheetName)}`;
}

export async function readPublicSheet(url: string, sheetName: string, headerRow = 1) {
  const response = await fetch(buildCsvUrl(url, sheetName), { cache: "no-store" });
  if (!response.ok) throw new Error("A planilha não está pública ou a aba não existe.");
  const text = await response.text();
  if (/<!doctype html|<html/i.test(text)) throw new Error("O Google não retornou dados públicos em CSV.");
  const matrix = parse(text, { columns: false, skip_empty_lines: true, bom: true, relax_column_count: true }) as string[][];
  const headers = matrix[Math.max(0, headerRow - 1)]?.map((value, index) => value.trim() || `__column_${index + 1}`) ?? [];
  if (!headers.length) throw new Error(`A linha de cabeçalho ${headerRow} não existe.`);
  return matrix.slice(headerRow).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]))) as Record<string, string>[];
}

export function mapSourceRow(row: Record<string, unknown>, mapping: Record<string, string>) {
  const read = (key: string) => {
    const configured = asText(row[mapping[key]]).trim();
    if (configured || key !== "tinyId") return configured;
    const fallbackKey = Object.keys(row).find((column) => /(^id$|\bid$)/i.test(column.trim()));
    return fallbackKey ? asText(row[fallbackKey]).trim() : "";
  };
  const sku = read("sku");
  const ean = read("ean");
  return { row, sku, skuKey: normalizeSku(sku), ean, eanKey: normalizeEan(ean) || null, read };
}
