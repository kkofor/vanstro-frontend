import { importKnowledgeBase } from "./kb-import.js";

type Command = "erp-jobs-list" | "erp-jobs-retry" | "email-outbox-list" | "email-outbox-retry" | "kb:import";

type CliConfig = {
  apiBaseUrl: string;
  token: string;
};

function usage() {
  return [
    "Usage: vanstro <command> [id]",
    "",
    "Commands:",
    "  erp-jobs-list",
    "  erp-jobs-retry <jobId>",
    "  email-outbox-list",
    "  email-outbox-retry <outboxId>",
    "  kb:import --dir <path> [--dry-run]",
    "",
    "Required environment:",
    "  VANSTRO_API_BASE_URL=https://api.example.com/api/v1",
    "  VANSTRO_SERVICE_ACCOUNT_TOKEN=vsa_..."
  ].join("\n");
}

function getConfig(env = process.env): CliConfig {
  const apiBaseUrl = env.VANSTRO_API_BASE_URL?.replace(/\/$/, "");
  const token = env.VANSTRO_SERVICE_ACCOUNT_TOKEN;

  if (!apiBaseUrl || !token) {
    throw new Error("VANSTRO_API_BASE_URL and VANSTRO_SERVICE_ACCOUNT_TOKEN are required.");
  }

  return { apiBaseUrl, token };
}

async function request(config: CliConfig, path: string, method = "GET") {
  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${config.token}`,
      accept: "application/json"
    }
  });
  const body = await response.json().catch(() => undefined);

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body && typeof body.error === "string"
        ? body.error
        : `API request failed with ${response.status}.`;
    throw new Error(message);
  }

  return body;
}

function parseCommand(args: string[]) {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(usage());
    return { command: undefined as Command | undefined, id: undefined };
  }
  if (args.includes("--version") || args.includes("-v")) {
    console.log("0.1.0");
    return { command: undefined as Command | undefined, id: undefined };
  }

  const [command, id] = args;

  if (command === "kb:import") {
    const dirIndex = args.indexOf("--dir");
    const dir = dirIndex >= 0 ? args[dirIndex + 1] : undefined;
    if (!dir || dir.startsWith("--")) throw new Error("kb:import requires --dir <path>.\n\n" + usage());
    return { command, id: dir, dryRun: args.includes("--dry-run") };
  }

  if (
    command !== "erp-jobs-list" &&
    command !== "erp-jobs-retry" &&
    command !== "email-outbox-list" &&
    command !== "email-outbox-retry"
  ) {
    throw new Error(usage());
  }

  if ((command === "erp-jobs-retry" || command === "email-outbox-retry") && !id) {
    throw new Error(`${command} requires an id.\n\n${usage()}`);
  }

  return { command, id, dryRun: false };

}

export async function runCli(args = process.argv.slice(2), env = process.env) {
  const { command, id, dryRun } = parseCommand(args);
  if (!command) return;
  if (command === "kb:import") {
    let database;
    if (!dryRun) {
      if (!env.DATABASE_URL?.trim()) throw new Error("DATABASE_URL is required for a real knowledge-base import.");
      database = (await import("@vanstro/db")).prisma;
    }
    const summary = await importKnowledgeBase(id!, { dryRun, database });
    return summary;
  }
  const config = getConfig(env);

  switch (command) {
    case "erp-jobs-list":
      return request(config, "/cli/erp-sync-jobs");
    case "erp-jobs-retry":
      return request(config, `/cli/erp-sync-jobs/${encodeURIComponent(id ?? "")}/retry`, "POST");
    case "email-outbox-list":
      return request(config, "/cli/email/outbox");
    case "email-outbox-retry":
      return request(config, `/cli/email/outbox/${encodeURIComponent(id ?? "")}/retry`, "POST");
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
