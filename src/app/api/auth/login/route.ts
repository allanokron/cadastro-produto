import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { z } from "zod";
import { assertSameOrigin, createSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({ login: z.string().min(1), password: z.string().min(1) });

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = schema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { login: body.login } });
    if (!user || !(await compare(body.password, user.passwordHash))) {
      return NextResponse.json({ error: "Usuário ou senha inválidos." }, { status: 401 });
    }
    await createSession(user.id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível entrar." }, { status: 400 });
  }
}
