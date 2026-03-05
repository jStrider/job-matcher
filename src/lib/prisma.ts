import { PrismaClient } from "@/generated/prisma";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function makePrisma() {
  return new PrismaClient();
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
