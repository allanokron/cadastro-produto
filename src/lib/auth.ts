import { cookies, headers } from "next/headers";
import { createHash, randomBytes } from "crypto";
import { prisma } from "./db";

export const SESSION_COOKIE = "okr_session";
const SESSION_AGE = 60 * 60 * 8;

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  await prisma.session.create({
    data: { userId, tokenHash: digest(token), expiresAt: new Date(Date.now() + SESSION_AGE * 1000) },
  });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_AGE,
  });
}

export async function getSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return prisma.session.findFirst({
    where: { tokenHash: digest(token), expiresAt: { gt: new Date() } },
    include: { user: true },
  });
}

export async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { tokenHash: digest(token) } });
  store.delete(SESSION_COOKIE);
}

export async function requestIpHash() {
  const h = await headers();
  return digest(h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local");
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  if (new URL(origin).host !== new URL(request.url).host) throw new Error("INVALID_ORIGIN");
}
