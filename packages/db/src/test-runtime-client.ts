import { PrismaClient } from "@prisma/client";

export function ownedRuntimeClient() {
  const url = process.env.TEST_RUNTIME_DATABASE_URL;
  if (!url || !/(test|smoke|disposable)/i.test(new URL(url).pathname)) throw new Error("owned runtime database is required");
  return new PrismaClient({ datasources: { db: { url } } });
}
