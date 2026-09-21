import { serve } from "@hono/node-server";
import { prisma, reconcileMediaRetryRetention } from "@vanstro/db";
import { createApp } from "./app.js";
import { loadApiConfig } from "./config.js";
import { startBatchIngestWorker } from "./dashboard/batch-ingest.js";

const config = loadApiConfig();
const retryRetentionInterval = setInterval(
  () => void reconcileMediaRetryRetention(prisma),
  60_000
);
retryRetentionInterval.unref();
void reconcileMediaRetryRetention(prisma);

// V11-R1 P4: canonical batch ingest worker loop (async commits).
const batchIngestInterval = startBatchIngestWorker();

const server = serve(
  {
    fetch: createApp().fetch,
    hostname: config.hostname,
    port: config.port
  },
  (info) => {
    console.log(`VanStro API listening on http://${info.address}:${info.port}`);
  }
);

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  clearInterval(retryRetentionInterval);
  clearInterval(batchIngestInterval);
  console.log(JSON.stringify({ service: "vanstro-api", signal, message: "Graceful shutdown started." }));
  const deadline = setTimeout(() => process.exit(1), 25_000);
  deadline.unref();
  server.close(async (error) => {
    clearTimeout(deadline);
    await prisma.$disconnect();
    if (error) {
      console.error("API shutdown failed.", error);
      process.exit(1);
    }
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
