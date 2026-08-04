import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { normalizeSku } from "@/lib/normalization";

const schema = z.object({
  sku: z.string().min(1), weight: z.number().finite().nullable().optional(), length: z.number().finite().nullable().optional(),
  width: z.number().finite().nullable().optional(), height: z.number().finite().nullable().optional(), additionalInformation: z.string().optional(),
  approvedDescription: z.string().optional(), imageUrls: z.array(z.string().url()).optional(),
});

export async function PUT(request: Request) {
  try {
    assertSameOrigin(request); await requireSession();
    const body = schema.parse(await request.json());
    const skuKey = normalizeSku(body.sku);
    const data = { weight: body.weight, length: body.length, width: body.width, height: body.height, additionalInformation: body.additionalInformation, approvedDescription: body.approvedDescription, imageUrls: body.imageUrls };
    const result = await prisma.productOverride.upsert({ where: { skuKey }, update: data, create: { skuKey, ...data } });
    return NextResponse.json({ ok: true, item: result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Dados inválidos." }, { status: 400 });
  }
}
