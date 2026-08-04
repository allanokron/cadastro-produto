import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { normalizeSku } from "@/lib/normalization";

export async function GET() {
  try {
    await requireSession();
    const items = await prisma.productOverride.findMany({ where: { excludedFromAnalysis: true }, orderBy: { excludedAt: "desc" } });
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await requireSession();
    const body = z.object({ skuKeys: z.array(z.string()).min(1).max(20000), reason: z.string().optional() }).parse(await request.json());
    const skuKeys = [...new Set(body.skuKeys.map(normalizeSku).filter(Boolean))];
    await prisma.$transaction(skuKeys.map((skuKey) => prisma.productOverride.upsert({
      where: { skuKey },
      update: { excludedFromAnalysis: true, exclusionReason: body.reason || "Não cadastrar no Tiny", excludedAt: new Date() },
      create: { skuKey, excludedFromAnalysis: true, exclusionReason: body.reason || "Não cadastrar no Tiny", excludedAt: new Date() },
    })));
    return NextResponse.json({ updated: skuKeys.length });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível inativar." }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    await requireSession();
    const { skuKey } = z.object({ skuKey: z.string().min(1) }).parse(await request.json());
    await prisma.productOverride.update({ where: { skuKey: normalizeSku(skuKey) }, data: { excludedFromAnalysis: false, exclusionReason: null, excludedAt: null } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível reativar." }, { status: 400 });
  }
}
