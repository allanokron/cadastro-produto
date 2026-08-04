import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateImageUrls } from "@/lib/image-urls";
import { validatePhysicalData } from "@/lib/validation";

function text(data: unknown, key: string) { return String((data as Record<string, unknown> | null)?.[key] ?? "").trim(); }
function flexibleId(data: unknown, configured: string) {
  const row = (data ?? {}) as Record<string, unknown>;
  if (configured && text(row, configured)) return text(row, configured);
  const key = Object.keys(row).find((name) => /(^id$|\bid$)/i.test(name.trim()));
  return key ? text(row, key) : "";
}

export async function GET(request: Request) {
  try {
    await requireSession();
    const mode = new URL(request.url).searchParams.get("mode") ?? "pending";
    const run = await prisma.syncRun.findFirst({ where: { status: { in: ["COMPLETED", "PARTIAL"] } }, orderBy: { createdAt: "desc" } });
    if (!run) return NextResponse.json({ items: [], run: null });
    const [inactive, settings, seniorSource, tinySource] = await Promise.all([
      prisma.productOverride.findMany({ where: { excludedFromAnalysis: true }, select: { skuKey: true } }),
      prisma.appSetting.findUnique({ where: { key: "content" } }),
      prisma.dataSource.findUnique({ where: { type: "SENIOR" } }),
      prisma.dataSource.findUnique({ where: { type: "TINY" } }),
    ]);
    const inactiveKeys = inactive.map((item) => item.skuKey);
    const where = mode === "validation"
      ? { syncRunId: run.id, tinyData: { not: undefined }, skuKey: { notIn: inactiveKeys } }
      : { syncRunId: run.id, comparisonStatus: "PENDING_TINY" as const, skuKey: { notIn: inactiveKeys } };
    const items = await prisma.productSnapshot.findMany({ where, orderBy: [{ stock: "desc" }, { name: "asc" }], take: 20000 });
    const keys = items.map((item) => item.skuKey);
    const [overrides, generations] = await Promise.all([
      prisma.productOverride.findMany({ where: { skuKey: { in: keys } } }),
      prisma.aiGeneration.findMany({ where: { skuKey: { in: keys }, status: "COMPLETED" }, orderBy: { createdAt: "desc" } }),
    ]);
    const overrideMap = new Map(overrides.map((item) => [item.skuKey, item]));
    const aiMap = new Map<string, string>();
    for (const item of generations) if (item.output && !aiMap.has(item.skuKey)) aiMap.set(item.skuKey, item.output);
    const config = (settings?.value ?? {}) as Record<string, unknown>;
    const seniorIdHeader = String((seniorSource?.columnMapping as Record<string, string> | null)?.tinyId ?? "");
    const tinyIdHeader = String((tinySource?.columnMapping as Record<string, string> | null)?.tinyId ?? "");
    const result = items.map((item) => {
      const override = overrideMap.get(item.skuKey);
      const physical = validatePhysicalData({
        weight: override?.weight ?? text(item.seniorData, String((seniorSource?.columnMapping as Record<string, string> | null)?.weight ?? "weight")),
        length: override?.length ?? text(item.seniorData, String((seniorSource?.columnMapping as Record<string, string> | null)?.length ?? "length")),
        width: override?.width ?? text(item.seniorData, String((seniorSource?.columnMapping as Record<string, string> | null)?.width ?? "width")),
        height: override?.height ?? text(item.seniorData, String((seniorSource?.columnMapping as Record<string, string> | null)?.height ?? "height")),
      });
      const generatedImages = generateImageUrls({ pattern: String(config.imageUrlPattern ?? ""), sku: item.sku, ean: item.ean, count: Number(config.imageCount ?? 5), start: Number(config.imageStart ?? 1), extension: String(config.imageExtension ?? "jpg") });
      const imageUrls = (override?.imageUrls as string[] | null) ?? generatedImages;
      const seniorId = flexibleId(item.seniorData, seniorIdHeader);
      const tinyId = flexibleId(item.tinyData, tinyIdHeader);
      const validationStatus = !seniorId && tinyId ? "ID_MISSING" : seniorId && tinyId && seniorId !== tinyId ? "ID_DIVERGENT" : seniorId && tinyId ? "CORRECT" : "ID_UNAVAILABLE";
      const needsReview = !physical.valid || !override?.approvedDescription || imageUrls.length === 0;
      return { ...item, override, aiDescription: aiMap.get(item.skuKey) ?? null, physicalIssues: physical.issues, physicalValues: physical.values, imageUrls, needsReview, validationStatus, seniorTinyId: seniorId, tinyId };
    });
    return NextResponse.json({ items: mode === "validation" ? result.filter((item) => item.validationStatus !== "ID_UNAVAILABLE") : result, run: { id: run.id, createdAt: run.createdAt, finishedAt: run.finishedAt } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não autorizado." }, { status: 400 });
  }
}
