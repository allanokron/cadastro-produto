import { after, NextResponse } from "next/server";
import { assertSameOrigin, requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { processSync } from "@/lib/sync";

export const maxDuration = 300;

export async function GET() {
  try {
    await requireSession();
    return NextResponse.json(await prisma.syncRun.findMany({ orderBy: { createdAt: "desc" }, take: 20 }));
  } catch {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await requireSession();
    const active = await prisma.syncRun.findFirst({ where: { status: { in: ["PENDING", "RUNNING"] } } });
    if (active) return NextResponse.json({ error: "Já existe uma atualização em andamento.", runId: active.id }, { status: 409 });
    const run = await prisma.syncRun.create({ data: { status: "PENDING" } });
    after(() => processSync(run.id));
    return NextResponse.json({ runId: run.id, status: run.status }, { status: 202 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao iniciar." }, { status: 400 });
  }
}
