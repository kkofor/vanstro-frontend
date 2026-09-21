import assert from "node:assert/strict";
import test from "node:test";
import { declarationValue, readProject } from "./contract-helpers.mjs";

const aliases = [
  "background", "foreground", "surface", "surface-muted", "border", "primary", "primary-hover",
  "primary-foreground", "accent", "accent-hover", "accent-foreground", "muted-foreground", "success",
  "warning", "error", "error-surface", "focus", "radius-sm", "radius-md", "radius-lg", "shadow-panel",
  "shadow-floating", "font-sans"
];

const expectedSources = {
  background: "--color-surface",
  foreground: "--color-text",
  surface: "--color-surface",
  "surface-muted": "--color-soft",
  border: "--color-line",
  primary: "--color-ink",
  "primary-hover": "--color-ink-2",
  "primary-foreground": "--color-surface",
  accent: "--color-accent",
  "accent-hover": "--color-accent-dark",
  "accent-foreground": "--color-text",
  "muted-foreground": "--color-text-muted",
  success: "--color-success",
  warning: "--color-accent-text",
  error: "--color-error",
  "error-surface": "--color-error-soft",
  focus: "--color-focus",
  "radius-sm": "--radius-sm",
  "radius-md": "--radius-md",
  "radius-lg": "--radius-lg",
  "shadow-panel": "--shadow-panel",
  "shadow-floating": "--shadow-floating"
};

test("the exact UI semantic alias set derives from existing VanStro variables", () => {
  const css = readProject("src/app/globals.css");
  const declared = new Set([...css.matchAll(/--ui-([\w-]+)\s*:/g)].map((match) => match[1]));
  assert.deepEqual([...declared].sort(), [...aliases].sort(), "UI-0 aliases must be exact: no missing or speculative tokens");
  for (const [alias, source] of Object.entries(expectedSources)) {
    assert.equal(declarationValue(css, `--ui-${alias}`), `var(${source})`, `--ui-${alias} must derive from ${source}`);
  }
  const font = declarationValue(css, "--ui-font-sans");
  assert.match(font, /(?:Segoe UI|system-ui)/, "font alias must reuse the existing body font stack");
  assert.doesNotMatch(css, /--ui-([\w-]+)\s*:\s*var\(--ui-\1\)/, "aliases cannot self-reference");
});

test("Tailwind v4 is loaded without preflight or a base reset", () => {
  const css = readProject("src/app/globals.css");
  assert.match(css, /@import\s+["']tailwindcss\/theme(?:\.css)?["']/);
  assert.match(css, /@import\s+["']tailwindcss\/utilities(?:\.css)?["']/);
  assert.doesNotMatch(css, /tailwindcss\/preflight|@tailwind\s+base|@import\s+["']tailwindcss["']\s*;/, "UI-0 must not enable preflight implicitly or explicitly");
});

test("the inline Tailwind theme exposes every UI alias without literal brand duplication", () => {
  const css = readProject("src/app/globals.css");
  const theme = css.match(/@theme\s+inline\s*\{([\s\S]*?)\}/)?.[1];
  assert.ok(theme, "globals.css must contain @theme inline");
  for (const alias of aliases) assert.match(theme, new RegExp(`var\\(--ui-${alias}\\)`), `theme must expose --ui-${alias}`);
  assert.doesNotMatch(theme, /#[0-9a-f]{3,8}\b|rgba?\(/i, "theme mappings must not duplicate literal brand values");
});
