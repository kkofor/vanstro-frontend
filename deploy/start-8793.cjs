const { spawn } = require("child_process");
const dotenv = require("/www/wwwroot/vanstro.ca/account-ux/node_modules/dotenv");

dotenv.config({ path: "/www/wwwroot/vanstro.ca/account-ux/.env", quiet: true });
process.env.HOSTNAME = "127.0.0.1";
process.env.PORT = "8793";
process.env.VANSTRO_WEBSITE_API_BASE_URL =
  process.env.VANSTRO_WEBSITE_API_BASE_URL || "https://www.vanstro.ca/api/v1";
process.env.NEXT_PUBLIC_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.vanstro.ca";

// Foreground spawn so systemd can supervise. The /tmp helper used detached+unref
// for SSH/nohup; that would make Type=simple exit immediately and restart-loop.
const child = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", "8793"],
  {
    cwd: "/www/wwwroot/vanstro.ca-next",
    env: process.env,
    stdio: "inherit"
  }
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
