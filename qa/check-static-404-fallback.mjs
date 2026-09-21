import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { join } from "node:path";

const root = process.cwd();
const port = 42000 + Math.floor(Math.random() * 1000);
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, [join(root, "qa", "static_server.mjs"), String(port), join(root, "out")], {
  stdio: ["ignore", "pipe", "pipe"]
});
let diagnostics = "";
server.stdout.on("data", (chunk) => { diagnostics += chunk; });
server.stderr.on("data", (chunk) => { diagnostics += chunk; });

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${origin}/404/`);
      if (response.ok) return;
    } catch {
      // Wait for the child process to begin listening.
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Static QA server did not start.\n${diagnostics}`);
}

async function assertPage(path, { status, language, heading, switchHref }) {
  const response = await fetch(`${origin}${path}`);
  const html = await response.text();
  assert.equal(response.status, status, `${path} must return HTTP ${status}`);
  assert(html.includes(`<html lang="${language}"`), `${path} must serve the ${language} document`);
  assert(html.includes(`<h1>${heading}</h1>`), `${path} must render the expected 404 heading`);
  assert(html.includes(`href="${switchHref}"`), `${path} must link to its locale counterpart`);
}

try {
  await waitForServer();
  await assertPage("/unknown/path", {
    status: 404,
    language: "en-CA",
    heading: "This page could not be found",
    switchHref: "/fr/404/"
  });
  await assertPage("/fr/chemin/inconnu", {
    status: 404,
    language: "fr-CA",
    heading: "Cette page est introuvable",
    switchHref: "/404/"
  });
  await assertPage("/404/", {
    status: 200,
    language: "en-CA",
    heading: "This page could not be found",
    switchHref: "/fr/404/"
  });
  await assertPage("/fr/404/", {
    status: 200,
    language: "fr-CA",
    heading: "Cette page est introuvable",
    switchHref: "/404/"
  });
  console.log("Static 404 fallback checks passed: unknown EN/FR paths serve locale-specific artifacts with HTTP 404.");
} finally {
  server.kill("SIGTERM");
}
