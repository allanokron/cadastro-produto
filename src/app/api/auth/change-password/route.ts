import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({ newPassword: z.string().min(1).max(200) });

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    const body = schema.parse(await request.json());
    await prisma.user.update({
      where: { id: session.user.id },
      data: { passwordHash: await hash(body.newPassword, 12), mustChangePassword: false },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao alterar senha." }, { status: 400 });
  }
}
