import OpenAI from "openai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, requireSession } from "@/lib/auth";
import { defaultModel, getOpenAIConfiguration, removeOpenAIConfiguration, saveOpenAIConfiguration } from "@/lib/openai-config";

async function testKey(apiKey: string) {
  if (!apiKey) throw new Error("Informe uma chave de API.");
  const client = new OpenAI({ apiKey });
  await client.models.list();
}

export async function GET() {
  try {
    await requireSession();
    const config = await getOpenAIConfiguration();
    return NextResponse.json({ configured: Boolean(config.apiKey), storedInSystem: config.storedInSystem, model: config.model || defaultModel });
  } catch {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
}

export async function PUT(request: Request) {
  try {
    assertSameOrigin(request); await requireSession();
    const body = z.object({ apiKey: z.string().min(20), model: z.string().min(1).max(100) }).parse(await request.json());
    await testKey(body.apiKey.trim());
    await saveOpenAIConfiguration(body.apiKey.trim(), body.model.trim());
    return NextResponse.json({ ok: true, model: body.model.trim() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível validar a chave." }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request); await requireSession();
    const config = await getOpenAIConfiguration();
    await testKey(config.apiKey);
    return NextResponse.json({ ok: true, model: config.model });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha no teste." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request); await requireSession(); await removeOpenAIConfiguration();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao remover." }, { status: 400 });
  }
}
