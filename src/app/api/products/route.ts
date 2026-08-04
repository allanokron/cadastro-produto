import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    await requireSession();
    const mode = new URL(request.url).searchParams.get("mode") ?? "pending";
    const run = await prisma.syncRun.findFirst({ where: { status: { in: ["COMPLETED", "PARTIAL"] } }, orderBy: { createdAt: "desc" } });
    if (!run) return NextResponse.json({ items: [] });
    const where = mode === "validation"
      ? { syncRunId: run.id, comparisonStatus: { in: ["ID_MISSING", "ID_DIVERGENT", "AMBIGUOUS", "UNMATCHED"] as never[] } }
      : { syncRunId: run.id, comparisonStatus: "PENDING_TINY" as const };
    const items = await prisma.productSnapshot.findMany({ where, orderBy: [{ stock: "desc" }, { name: "asc" }], take: 2000 });
    const keys = items.map((item) => item.skuKey);
    const [overrides, generations] = await Promise.all([
      prisma.productOverride.findMany({ where: { skuKey: { in: keys } } }),
      prisma.aiGeneration.findMany({ where: { skuKey: { in: keys }, status: "COMPLETED" }, orderBy: { createdAt: "desc" } }),
    ]);
    const overrideMap = new Map(overrides.map((item) => [item.skuKey, item]));
    const aiMap = new Map<string, string>();
    for (const item of generations) if (item.output && !aiMap.has(item.skuKey)) aiMap.set(item.skuKey, item.output);
    return NextResponse.json({ items: items.map((item) => ({ ...item, override: overrideMap.get(item.skuKey) ?? null, aiDescription: aiMap.get(item.skuKey) ?? null })) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não autorizado." }, { status: 401 });
  }
}
