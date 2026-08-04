import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateImageUrls } from "@/lib/image-urls";

export async function GET(request: Request) {
  try {
    await requireSession();
    const params = new URL(request.url).searchParams;
    const search = (params.get("search") ?? "").trim();

    const run = await prisma.syncRun.findFirst({
      where: { status: { in: ["COMPLETED", "PARTIAL"] } },
      orderBy: { createdAt: "desc" },
    });
    if (!run) return NextResponse.json({ items: [] });

    const [settings, inactive] = await Promise.all([
      prisma.appSetting.findUnique({ where: { key: "content" } }),
      prisma.productOverride.findMany({
        where: { excludedFromAnalysis: true },
        select: { skuKey: true },
      }),
    ]);

    const inactiveKeys = inactive.map((i) => i.skuKey);
    const config = (settings?.value ?? {}) as Record<string, unknown>;

    const where = {
      syncRunId: run.id,
      skuKey: { notIn: inactiveKeys },
      ...(search
        ? {
            OR: [
              { sku: { contains: search, mode: "insensitive" as const } },
              { name: { contains: search, mode: "insensitive" as const } },
              { ean: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const rows = await prisma.productSnapshot.findMany({
      where,
      orderBy: [{ stock: "desc" }, { name: "asc" }],
      take: 200,
      select: {
        sku: true,
        skuKey: true,
        name: true,
        brand: true,
        ean: true,
        stock: true,
        price: true,
        seniorData: true,
      },
    });

    const items = rows.map((row) => {
      const generated = generateImageUrls({
        pattern: String(config.imageUrlPattern ?? ""),
        sku: row.sku,
        ean: row.ean,
        count: Number(config.imageCount ?? 5),
        start: Number(config.imageStart ?? 1),
        extension: String(config.imageExtension ?? "jpg"),
      });
      const firstImageUrl = generated[0] ?? null;

      return {
        sku: row.sku,
        skuKey: row.skuKey,
        name: row.name,
        brand: row.brand,
        stock: row.stock?.toString() ?? null,
        price: row.price?.toString() ?? null,
        firstImageUrl,
      };
    });

    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao buscar produtos." },
      { status: 400 }
    );
  }
}
