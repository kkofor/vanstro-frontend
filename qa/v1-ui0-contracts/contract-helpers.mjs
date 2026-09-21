import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const uiDir = join(root, "src/components/ui");
export const legacyUiEntries = new Set(["CommerceStatePanel.tsx", "HorizontalScrollRail.tsx"]);

export const readProject = (path) => readFileSync(join(root, path), "utf8");

export function projectFiles(start, extensions = new Set([".ts", ".tsx", ".mjs", ".css"])) {
  const files = [];
  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (["node_modules", ".next", ".git"].includes(entry.name)) continue;
      const absolute = join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile() && extensions.has(extname(entry.name))) files.push(absolute);
    }
  }
  visit(join(root, start));
  return files.sort();
}

export function uiSourceFiles({ includeLegacy = false } = {}) {
  return projectFiles("src/components/ui", new Set([".ts", ".tsx"]))
    .filter((file) => includeLegacy || !legacyUiEntries.has(relative(uiDir, file)));
}

export function git(...args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" });
}

// The pre-UI-0 baseline differs per standard line: the Frontend line pinned
// 1cd3b850, while the Integration line's own pre-merge tree is f111bb74 (the
// S02 completion). A chained UI-0 merge's first parent already contains UI-0,
// so select by ancestry: if f111bb74 is reachable from HEAD we are on the
// Integration line; otherwise the Frontend baseline applies.
export function ui0Baseline() {
  const integrationBase = "f111bb74d24b876e0990d7929325d44134d05dea";
  try {
    git("merge-base", "--is-ancestor", integrationBase, "HEAD");
    return integrationBase;
  } catch {
    return "1cd3b850a36051d1306334cde38a62cc995bfa5d";
  }
}

export function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

export function importedSpecifiers(source) {
  const results = [];
  for (const match of stripComments(source).matchAll(/(?:\bfrom\s*|\bimport\s*)["']([^"']+)["']/g)) results.push(match[1]);
  return results;
}

export function exportedNames(source) {
  const names = new Set();
  const clean = stripComments(source);
  for (const match of clean.matchAll(/export\s*\{([\s\S]*?)\}\s*(?:from\s*["'][^"']+["'])?\s*;?/g)) {
    for (const item of match[1].split(",")) {
      const normalized = item.trim().replace(/^type\s+/, "");
      if (!normalized) continue;
      const sides = normalized.split(/\s+as\s+/);
      names.add((sides[1] ?? sides[0]).trim());
    }
  }
  for (const match of clean.matchAll(/export\s+(?:declare\s+)?(?:const|function|class|type|interface)\s+([A-Za-z_$][\w$]*)/g)) names.add(match[1]);
  return [...names].sort();
}

export function declarationValue(source, property) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = [...source.matchAll(new RegExp(`${escaped}\\s*:\\s*([^;{}]+)\\s*;`, "g"))];
  assert.equal(matches.length, 1, `${property} must be declared exactly once`);
  return matches[0][1].trim();
}
