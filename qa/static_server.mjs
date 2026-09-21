import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";

const port = Number(process.argv[2] ?? 4173);
const root = resolve(process.argv[3] ?? "out");

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp"
};

function decodedPath(urlPath) {
  return decodeURIComponent(urlPath.split("?")[0] ?? "/");
}

function safePath(urlPath) {
  const normalizedPath = normalize(decodedPath(urlPath)).replace(/^(\.\.(\/|\\|$))+/, "");
  return join(root, normalizedPath);
}

async function firstExistingFile(candidates) {
  for (const candidate of candidates) {
    const resolved = resolve(candidate);
    if (resolved !== root && !resolved.startsWith(`${root}${sep}`)) continue;

    try {
      const fileStat = await stat(resolved);
      if (fileStat.isFile()) return resolved;
    } catch {
      // Try the next candidate.
    }
  }

  return null;
}

async function findFile(urlPath) {
  const requested = safePath(urlPath);
  const requestedFile = await firstExistingFile([
    requested,
    join(requested, "index.html"),
    `${requested}.html`
  ]);
  if (requestedFile) return { file: requestedFile, isFallback: false };

  const pathname = decodedPath(urlPath);
  const frenchRequest = pathname === "/fr" || pathname.startsWith("/fr/");
  const fallbackFile = await firstExistingFile([
    ...(frenchRequest ? [join(root, "fr", "404", "index.html")] : []),
    join(root, "404.html")
  ]);

  return fallbackFile ? { file: fallbackFile, isFallback: true } : null;
}

const server = createServer(async (request, response) => {
  let result;
  try {
    result = await findFile(request.url ?? "/");
  } catch {
    response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Bad request");
    return;
  }

  if (!result) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(result.isFallback ? 404 : 200, {
    "Content-Type": contentTypes[extname(result.file)] ?? "application/octet-stream"
  });
  createReadStream(result.file).pipe(response);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Static QA server listening on http://127.0.0.1:${port}`);
});
