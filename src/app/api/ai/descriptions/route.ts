import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateDescription } from "@/lib/ai";
import { getOpenAIConfiguration } from "@/lib/openai-config";

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await requireSession();
    const { skuKeys } = z.object({ skuKeys: z.array(z.string()).min(1).max(50) }).parse(await request.json());
    const latest = await prisma.syncRun.findFirst({ where: { status: { in: ["COMPLETED", "PARTIAL"] } }, orderBy: { createdAt: "desc" } });
    if (!latest) throw new Error("Execute uma atualização antes de gerar descrições.");
    const products = await prisma.productSnapshot.findMany({ where: { syncRunId: latest.id, skuKey: { in: skuKeys } } });
    const setting = await prisma.appSetting.findUnique({ where: { key: "content" } });
    const config = (setting?.value ?? {}) as Record<string, unknown>;
    const openAIConfig = await getOpenAIConfiguration();
    const prompt = String(config.aiPrompt ?? "Crie uma descrição comercial usando somente os dados fornecidos.");
    let generated = 0;
    const outputs: Record<string, string> = {};
    const errors = [];

    for (const product of products) {
      const override = await prisma.productOverride.findUnique({ where: { skuKey: product.skuKey } });
      const input = { nome: product.name, marca: product.brand, categoria: product.category, sku: product.sku, ean: product.ean, dadosTecnicos: product.seniorData, informacoesAdicionais: override?.additionalInformation };
      const attempt = await prisma.aiGeneration.create({ data: { skuKey: product.skuKey, status: "RUNNING", model: openAIConfig.model, prompt, input } });
      try {
        const output = await generateDescription(input, prompt);
        await prisma.aiGeneration.update({ where: { id: attempt.id }, data: { status: "COMPLETED", output } });
        outputs[product.skuKey] = output;
        generated++;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erro na geração";
        errors.push(`${product.sku}: ${message}`);
        await prisma.aiGeneration.update({ where: { id: attempt.id }, data: { status: "FAILED", error: message } });
      }
    }
    return NextResponse.json({ generated, errors, outputs });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha na geração." }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    assertSameOrigin(request); await requireSession();
    const { skuKey, description } = z.object({ skuKey: z.string().min(1), description: z.string().min(1) }).parse(await request.json());
    await prisma.$transaction([
      prisma.productOverride.upsert({ where: { skuKey }, update: { approvedDescription: description }, create: { skuKey, approvedDescription: description } }),
      prisma.aiGeneration.updateMany({ where: { skuKey, output: description, status: "COMPLETED" }, data: { approvedAt: new Date() } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao aprovar." }, { status: 400 });
  }
}
