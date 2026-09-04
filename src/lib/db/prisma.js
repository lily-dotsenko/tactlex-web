import { PrismaClient } from "@prisma/client";

import { configureDatabaseUrl } from "@/lib/db/database-url";

configureDatabaseUrl();

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.__tactlexPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__tactlexPrisma = prisma;
}

export default prisma;
