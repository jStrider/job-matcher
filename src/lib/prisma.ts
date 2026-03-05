import { PrismaClient } from "@/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function makePrisma() {
  const url = process.env.DATABASE_URL;
  if (!url || url.includes("dummy")) {
    // Build-time: return a stub that won't connect
    return new PrismaClient() as PrismaClient;
  }
  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter });
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol) {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = makePrisma();
    }
    const client = globalForPrisma.prisma as unknown as Record<string | symbol, unknown>;
    const value = client[prop];
    if (typeof value === "function") {
      return (value as Function).bind(globalForPrisma.prisma);
    }
    return value;
  },
});
