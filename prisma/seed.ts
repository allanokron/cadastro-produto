import { hash } from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("DIRECT_URL ou DATABASE_URL não configurada.");

const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });

async function main() {
  await prisma.user.upsert({
    where: { login: "Admin" },
    update: {},
    create: {
      login: "Admin",
      passwordHash: await hash("Admin", 12),
      mustChangePassword: true,
    },
  });

  await prisma.appSetting.upsert({
    where: { key: "content" },
    update: {},
    create: {
      key: "content",
      value: {
        aiPrompt:
          "Crie uma descrição comercial clara para o produto usando somente as informações fornecidas. Não invente especificações técnicas. Organize em introdução, benefícios e diferenciais, evitando repetições.",
        imageUrlPattern: "https://dominio.com/imagens/{sku}_{numero}.{extensao}",
        imageStart: 1,
        imageCount: 5,
        imageExtension: "jpg",
        sourceWeightUnit: "kg",
        targetWeightUnit: "kg",
        sourceDimensionUnit: "cm",
        targetDimensionUnit: "cm",
      },
    },
  });
}

main().finally(() => prisma.$disconnect());
