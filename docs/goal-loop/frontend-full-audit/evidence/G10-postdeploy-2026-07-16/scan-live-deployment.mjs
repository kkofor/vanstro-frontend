import { readFile, readdir, writeFile } from "node:fs/promises";
import { basename, dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../../../..");
const artifactRoot = resolve(here, "artifact-extracted");
const logsRoot = resolve(here, "logs");
const matricesRoot = resolve(here, "matrices");
const baseUrl = "https://kkofor.github.io/vanstro-frontend";
const mb01Pattern = /(?:https?:)?\/\/mb01\.vanstro\.ca/gi;
const mb01UrlPattern = /https?:\/\/mb01\.vanstro\.ca\/[A-Za-z0-9._~!$&'()*+,;=:@%/?#-]+/gi;

async function walk(root) {
  const files = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else files.push(path);
    }
  }
  await visit(root);
  return files;
}

function routeFromHtml(path) {
  const artifactPath = relative(artifactRoot, path).split(sep).join("/");
  if (artifactPath === "index.html") return "/";
  if (artifactPath === "404.html") return "/__g10-not-found__/";
  if (artifactPath.endsWith("/index.html")) return `/${artifactPath.slice(0, -"index.html".length)}`;
  return `/${artifactPath}`;
}

function csv(rows, columns) {
  const quote = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return [columns.map(quote).join(","), ...rows.map((row) => columns.map((column) => quote(row[column])).join(","))].join("\n") + "\n";
}

function title(html) {
  return html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() ?? "";
}

function attribute(tag, name) {
  return tag.match(new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i"))?.slice(1).find((value) => value != null) ?? "";
}

function canonical(html) {
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    if (attribute(match[0], "rel").split(/\s+/).includes("canonical")) return attribute(match[0], "href");
  }
  return "";
}

async function fetchWithRetry(url, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { redirect: "follow", headers: { "user-agent": "VanStro-G10-read-only-audit/1.0" } });
      const body = await response.text();
      if (response.status >= 500 && attempt < attempts) continue;
      return { response, body, attempts: attempt };
    } catch (error) {
      lastError = error;
      if (attempt === attempts) throw error;
    }
  }
  throw lastError;
}

const htmlFiles = (await walk(artifactRoot)).filter((path) => basename(path) === "index.html" || basename(path) === "404.html");
const routes = htmlFiles.map(routeFromHtml).sort();
const rows = [];
const allMb01Urls = new Set();
let cursor = 0;

async function worker() {
  while (cursor < routes.length) {
    const route = routes[cursor++];
    const url = `${baseUrl}${route}`;
    try {
      const { response, body, attempts } = await fetchWithRetry(url);
      const mb01Urls = new Set(body.match(mb01UrlPattern) ?? []);
      for (const mb01Url of mb01Urls) allMb01Urls.add(mb01Url);
      const imageTags = [...body.matchAll(/<img\b[^>]*>/gi)].map((match) => match[0]);
      rows.push({
        route,
        requestedUrl: url,
        finalUrl: response.url,
        status: response.status,
        attempts,
        contentType: response.headers.get("content-type") ?? "",
        cacheControl: response.headers.get("cache-control") ?? "",
        bytes: Buffer.byteLength(body),
        title: title(body),
        canonical: canonical(body),
        mb01Occurrences: [...body.matchAll(mb01Pattern)].length,
        uniqueMb01Urls: mb01Urls.size,
        firstMb01Url: [...mb01Urls][0] ?? "",
        imageCount: imageTags.length,
        missingImageAlt: imageTags.filter((tag) => !/\balt\s*=/.test(tag)).length,
        result: response.status >= 200 && response.status < 400 ? "Pass" : route === "/__g10-not-found__/" && response.status === 404 ? "Pass: expected 404" : "Fail"
      });
    } catch (error) {
      rows.push({ route, requestedUrl: url, finalUrl: "", status: 0, attempts: 3, contentType: "", cacheControl: "", bytes: 0, title: "", canonical: "", mb01Occurrences: 0, uniqueMb01Urls: 0, firstMb01Url: "", imageCount: 0, missingImageAlt: 0, result: `Fail: ${error}` });
    }
  }
}

await Promise.all(Array.from({ length: 8 }, () => worker()));
rows.sort((a, b) => a.route.localeCompare(b.route));

const representativeRoutes = new Set([
  "/",
  "/products/",
  "/products/base-cabinet-b12-252/",
  "/products/lazy-susan-base-lsb36-281/",
  "/dealer-program/",
  "/articles/how-to-measure-for-cabinets/",
  "/zh/about/",
  "/__g10-not-found__/"
]);
const summary = {
  observedAt: new Date().toISOString(),
  baseUrl,
  sourceArtifactRoutes: routes.length,
  responses: rows.length,
  successfulOrExpected404: rows.filter((row) => row.result.startsWith("Pass")).length,
  failed: rows.filter((row) => !row.result.startsWith("Pass")).length,
  routesWithMb01References: rows.filter((row) => row.mb01Occurrences > 0).length,
  totalMb01Occurrences: rows.reduce((sum, row) => sum + row.mb01Occurrences, 0),
  uniqueMb01Urls: allMb01Urls.size,
  representative: rows.filter((row) => representativeRoutes.has(row.route))
};

await Promise.all([
  writeFile(resolve(logsRoot, "live-deployment-route-scan.json"), JSON.stringify({ summary, rows }, null, 2) + "\n"),
  writeFile(resolve(matricesRoot, "live-deployment-routes.csv"), csv(rows, Object.keys(rows[0])))
]);
console.log(JSON.stringify(summary, null, 2));
