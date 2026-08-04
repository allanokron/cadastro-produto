import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { parse } from "csv-parse/sync";
import { assertSameOrigin, requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { normalizeSku } from "@/lib/normalization";

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await requireSession();
    const file = (await request.formData()).get("file");
    if (!(file instanceof File) || file.size === 0) throw new Error("Selecione uma planilha XLSX ou CSV.");
    if (file.size > 20 * 1024 * 1024) throw new Error("A planilha deve ter no máximo 20 MB.");
    const buffer = Buffer.from(await file.arrayBuffer());
    let values: string[] = [];
    if (file.name.toLowerCase().endsWith(".csv")) {
      const rows = parse(buffer, { columns: true, skip_empty_lines: true, bom: true, relax_column_count: true }) as Record<string, unknown>[];
      values = rows.map((row) => String(Object.entries(row).find(([key]) => /^(sku|c[oó]digo|c[oó]digo \(sku\))$/i.test(key.trim()))?.[1] ?? Object.values(row)[0] ?? ""));
    } else {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
      const sheet = workbook.worksheets[0];
      if (!sheet) throw new Error("A planilha não possui abas.");
      const headers = (sheet.getRow(1).values as unknown[]).map((value) => String(value ?? "").trim());
      const skuColumn = headers.findIndex((header) => /^(sku|c[oó]digo|c[oó]digo \(sku\))$/i.test(header));
      const column = skuColumn > 0 ? skuColumn : 1;
      sheet.eachRow((row, number) => { if (number > 1) values.push(String(row.getCell(column).text ?? "")); });
    }
    const skuKeys = [...new Set(values.map(normalizeSku).filter(Boolean))];
    if (!skuKeys.length) throw new Error("Nenhum SKU foi encontrado. Use uma coluna chamada SKU ou Código.");
    for (let start = 0; start < skuKeys.length; start += 250) {
      await prisma.$transaction(skuKeys.slice(start, start + 250).map((skuKey) => prisma.productOverride.upsert({
        where: { skuKey },
        update: { excludedFromAnalysis: true, exclusionReason: `Importado de ${file.name}`, excludedAt: new Date() },
        create: { skuKey, excludedFromAnalysis: true, exclusionReason: `Importado de ${file.name}`, excludedAt: new Date() },
      })));
    }
    return NextResponse.json({ imported: skuKeys.length });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha na importação." }, { status: 400 });
  }
}
