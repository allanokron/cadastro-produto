import ExcelJS from "exceljs";

export type ExportColumn = {
  header: string;
  source: "field" | "fixed" | "empty" | "images";
  field?: string;
  value?: string;
  required?: boolean;
};

export async function generateTinyWorkbook(
  columns: ExportColumn[],
  products: Record<string, unknown>[],
  templateBuffer?: Buffer | null,
  headerRowNumber = 1,
) {
  const workbook = new ExcelJS.Workbook();
  if (templateBuffer) await workbook.xlsx.load(templateBuffer as unknown as ExcelJS.Buffer);
  const sheet = workbook.worksheets[0] ?? workbook.addWorksheet("Produtos");
  let effectiveColumns = columns;
  let templateStyles: Partial<ExcelJS.Style>[] = [];
  if (templateBuffer) {
    const header = sheet.getRow(headerRowNumber);
    const headers = Array.from({length:header.cellCount},(_,index)=>String(header.getCell(index+1).value??""));
    const byHeader = new Map(columns.map(column=>[column.header.trim().toLowerCase(),column]));
    effectiveColumns = headers.map(value=>byHeader.get(value.trim().toLowerCase())??{header:value,source:"empty" as const});
    const sample = sheet.getRow(headerRowNumber+1);
    templateStyles = effectiveColumns.map((_,index)=>({...sample.getCell(index+1).style}));
    if (sheet.rowCount>headerRowNumber) sheet.spliceRows(headerRowNumber+1,sheet.rowCount-headerRowNumber);
  } else {
    const header = sheet.addRow(columns.map((column) => column.header));
    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEA580C" } };
    header.alignment = { vertical: "middle" };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
  }

  for (const product of products) {
    const values = effectiveColumns.map((column) => {
      if (column.source === "fixed") return column.value ?? "";
      if (column.source === "empty") return "";
      if (column.source === "images") return Array.isArray(product.imageUrls) ? product.imageUrls.join(";") : "";
      return column.field ? String(product[column.field] ?? "") : "";
    });
    const missing = effectiveColumns.filter((column, index) => column.required && !values[index]);
    if (missing.length) throw new Error(`Campos obrigatórios ausentes: ${missing.map((item) => item.header).join(", ")}`);
    const row = sheet.addRow(values);
    effectiveColumns.forEach((column, index) => {
      if (templateStyles[index]) row.getCell(index + 1).style = templateStyles[index];
      if (/sku|ean|código/i.test(column.header)) row.getCell(index + 1).numFmt = "@";
    });
  }
  sheet.columns.forEach((column) => { column.width = Math.min(45, Math.max(14, column.header?.length ?? 14)); });
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
