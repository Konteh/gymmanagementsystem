import { PrismaClient } from "@prisma/client";
import { fillMissingCheckInTokens } from "@/lib/gym-tokens";

const globalForPrisma = globalThis as unknown as {
  prismaBase?: PrismaClient;
  prisma?: PrismaClient;
};

function createClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const base = globalForPrisma.prismaBase ?? createClient();
globalForPrisma.prismaBase = base;

let inflight: Promise<void> | null = null;
function ensureCheckInTokens() {
  if (!inflight) {
    inflight = fillMissingCheckInTokens(base).finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

export const prisma =
  globalForPrisma.prisma ??
  (base.$extends({
    query: {
      async $allOperations({ args, query }) {
        await ensureCheckInTokens();
        return query(args);
      },
    },
  }) as unknown as PrismaClient);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
