type Command = "erp-jobs-list" | "erp-jobs-retry" | "email-outbox-list" | "email-outbox-retry";

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

function parseCommand(args: string[]): { command: Command; id?: string } {
  const [command, id] = args;

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

  return { command, id };
}

export async function runCli(args = process.argv.slice(2), env = process.env) {
  const { command, id } = parseCommand(args);
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
