import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { extractImageUrls, generateImageUrls } from "@/lib/image-urls";

function text(data: unknown, key: string) {
  return String((data as Record<string, unknown> | null)?.[key] ?? "").trim();
}

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

    const [settings, inactive, overrides, tinySource] = await Promise.all([
      prisma.appSetting.findUnique({ where: { key: "content" } }),
      prisma.productOverride.findMany({
        where: { excludedFromAnalysis: true },
        select: { skuKey: true },
      }),
      prisma.productOverride.findMany({
        select: { skuKey: true, imageUrls: true },
      }),
      prisma.dataSource.findUnique({ where: { type: "TINY" } }),
    ]);

    const inactiveKeys = inactive.map((i) => i.skuKey);
    const overrideMap = new Map(overrides.map((o) => [o.skuKey, o]));
    const config = (settings?.value ?? {}) as Record<string, unknown>;
    const tinyMapping = (tinySource?.columnMapping ?? {}) as Record<string, string>;
    const tinyImageCol = tinyMapping.image ?? "";

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
        tinyData: true,
      },
    });

    const skuKeys = rows.map((r) => r.skuKey);
    const imageChecks = await prisma.imageCheck.findMany({
      where: { skuKey: { in: skuKeys } },
    });
    const imageCheckMap = new Map(imageChecks.map((c) => [c.skuKey, c]));

    const items = rows.map((row) => {
      const override = overrideMap.get(row.skuKey);
      const generated = generateImageUrls({
        pattern: String(config.imageUrlPattern ?? ""),
        sku: row.sku,
        ean: row.ean,
        count: Number(config.imageCount ?? 5),
        start: Number(config.imageStart ?? 1),
        extension: String(config.imageExtension ?? "jpg"),
      });

      const seniorUrls = extractImageUrls(row.seniorData);
      const tinyUrls = extractImageUrls(row.tinyData);

      let tinyImageUrl = "";
      if (tinyImageCol && row.tinyData && typeof row.tinyData === "object") {
        tinyImageUrl = text(row.tinyData, tinyImageCol);
      }

      const imageUrls = (override?.imageUrls as string[] | null) ?? [
        ...new Set([
          ...(tinyImageUrl ? [tinyImageUrl] : []),
          ...tinyUrls,
          ...seniorUrls,
          ...generated,
        ]),
      ];

      const check = imageCheckMap.get(row.skuKey);
      const signature = `v3:${JSON.stringify(imageUrls)}`;
      const imagesChecked = check?.urlsSignature === signature;
      const firstImageUrl = imagesChecked
        ? (check?.availableUrl ?? imageUrls[0] ?? null)
        : (imageUrls[0] ?? null);

      return {
        sku: row.sku,
        skuKey: row.skuKey,
        name: row.name,
        brand: row.brand,
        stock: row.stock?.toString() ?? null,
        price: row.price?.toString() ?? null,
        firstImageUrl,
        imagesChecked,
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
