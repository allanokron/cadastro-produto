import { NextResponse } from "next/server";
import { z } from "zod";
import { get, put } from "@vercel/blob";
import { assertSameOrigin, requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateTinyWorkbook, ExportColumn } from "@/lib/tiny-export";
import { generateImageUrls } from "@/lib/image-urls";

export const maxDuration = 300;
const defaults: ExportColumn[] = [
  { header: "Código (SKU)", source: "field", field: "sku", required: true },
  { header: "Descrição", source: "field", field: "name", required: true },
  { header: "GTIN/EAN", source: "field", field: "ean" },
  { header: "Preço", source: "field", field: "price" },
  { header: "Descrição complementar", source: "field", field: "approvedDescription" },
  { header: "Links externos", source: "images" },
];

export async function POST(request: Request) {
  let runId: string | undefined;
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("Conecte um Vercel Blob privado antes de exportar.");
    const { skuKeys } = z.object({ skuKeys: z.array(z.string()).min(1).max(20000) }).parse(await request.json());
    const latest = await prisma.syncRun.findFirst({ where: { status: { in: ["COMPLETED", "PARTIAL"] } }, orderBy: { createdAt: "desc" } });
    if (!latest) throw new Error("Execute uma atualização antes de exportar.");
    const snapshots = await prisma.productSnapshot.findMany({ where: { syncRunId: latest.id, skuKey: { in: skuKeys } } });
    const template = await prisma.tinyTemplate.findFirst({ where: { active: true }, orderBy: { createdAt: "desc" } });
    const setting = await prisma.appSetting.findUnique({ where: { key: "content" } });
    const config = (setting?.value ?? {}) as Record<string, unknown>;
    const run = await prisma.exportRun.create({ data: { userId: session.user.id, status: "RUNNING", quantity: snapshots.length } });
    runId = run.id;
    const products = [];
    for (const item of snapshots) {
      const override = await prisma.productOverride.findUnique({ where: { skuKey: item.skuKey } });
      if (override?.excludedFromAnalysis) continue;
      const imageUrls = (override?.imageUrls as string[] | null) ?? generateImageUrls({ pattern: String(config.imageUrlPattern ?? ""), sku: item.sku, ean: item.ean, count: Number(config.imageCount ?? 5), start: Number(config.imageStart ?? 1), extension: String(config.imageExtension ?? "jpg") });
      products.push({ ...item, stock: item.stock?.toString(), price: item.price?.toString(), cost: item.cost?.toString(), weight: override?.weight, length: override?.length, width: override?.width, height: override?.height, approvedDescription: override?.approvedDescription ?? "", imageUrls });
    }
    const columns = (template?.columnMapping as unknown as ExportColumn[] | null) ?? defaults;
    let templateBuffer: Buffer | null = null;
    if (template?.fileUrl) {
      const file = await get(template.fileUrl, { access: "private", token: process.env.BLOB_READ_WRITE_TOKEN });
      if (file?.stream) templateBuffer = Buffer.from(await new Response(file.stream as ReadableStream).arrayBuffer());
    }
    const buffer = await generateTinyWorkbook(columns, products, templateBuffer, template?.headerRow ?? 1);
    const now = new Date();
    const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
    const fileName = `cadastro_tiny_${stamp}.xlsx`;
    const blob = await put(`exports/${fileName}`, buffer, { access: "private", contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", token: process.env.BLOB_READ_WRITE_TOKEN });
    await prisma.$transaction([
      prisma.exportRun.update({ where: { id: run.id }, data: { status: "COMPLETED", fileUrl: blob.url, fileName, summary: { sourceSyncRunId: latest.id } } }),
      prisma.exportItem.createMany({ data: products.map((product) => ({ exportRunId: run.id, skuKey: product.skuKey, exportedData: JSON.parse(JSON.stringify(product)) })) }),
    ]);
    return NextResponse.json({ id: run.id, downloadUrl: `/api/exports/${run.id}/download` });
  } catch (error) {
    if (runId) await prisma.exportRun.update({ where: { id: runId }, data: { status: "FAILED", error: error instanceof Error ? error.message : "Falha" } });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha na exportação." }, { status: 400 });
  }
}
