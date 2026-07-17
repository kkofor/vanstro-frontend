import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  vanstroPrisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.vanstroPrisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.vanstroPrisma = prisma;
}

export * from "@prisma/client";
export { hashPassword, verifyPassword } from "./password.js";
