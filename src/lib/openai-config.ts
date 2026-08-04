import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";

const settingKey = "openai_credentials";
const defaultModel = "gpt-5.6-sol";

function encryptionKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET não configurada.");
  return createHash("sha256").update(secret).digest();
}

function encrypt(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${iv.toString("base64")}.${cipher.getAuthTag().toString("base64")}.${encrypted.toString("base64")}`;
}

function decrypt(value: string) {
  const [iv, tag, encrypted] = value.split(".").map((part) => Buffer.from(part, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export async function getOpenAIConfiguration() {
  const setting = await prisma.appSetting.findUnique({ where: { key: settingKey } });
  const value = (setting?.value ?? {}) as Record<string, unknown>;
  const encryptedApiKey = String(value.encryptedApiKey ?? "");
  return {
    apiKey: encryptedApiKey ? decrypt(encryptedApiKey) : process.env.OPENAI_API_KEY ?? "",
    model: String(value.model ?? process.env.OPENAI_MODEL ?? defaultModel),
    storedInSystem: Boolean(encryptedApiKey),
  };
}

export async function saveOpenAIConfiguration(apiKey: string, model: string) {
  const value = { encryptedApiKey: encrypt(apiKey), model, updatedAt: new Date().toISOString() };
  await prisma.appSetting.upsert({ where: { key: settingKey }, update: { value }, create: { key: settingKey, value } });
}

export async function removeOpenAIConfiguration() {
  await prisma.appSetting.deleteMany({ where: { key: settingKey } });
}

export { defaultModel };
