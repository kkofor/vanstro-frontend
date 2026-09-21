// Static contrast guard for the /dealer-program CTA section.
//
// The bottom CTA sits on the dark ink section (.dealer-program-cta,
// background: var(--color-ink)). Regression history: the section's
// .button-secondary rule set color: white while inheriting
// background: white from the base .button-secondary — white text on a
// white button. This test parses the actual globals.css declarations,
// resolves var()/rgba() values and enforces WCAG AA thresholds
// (>= 4.5:1 for text, >= 3:1 for UI component borders and focus rings).
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CSS_PATH = join(ROOT, "src/app/globals.css");

const NAMED_COLORS = { white: [255, 255, 255], black: [0, 0, 0] };

function parseColor(value, vars) {
  value = value.trim();
  const varMatch = value.match(/^var\(--([\w-]+)\)$/);
  if (varMatch) return parseColor(vars[varMatch[1]], vars);
  if (NAMED_COLORS[value]) return NAMED_COLORS[value];
  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = [...h].map((c) => c + c).join("");
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  }
  const rgb = value.match(/^rgba?\(([^)]+)\)$/i);
  if (rgb) {
    const parts = rgb[1].split(",").map((p) => p.trim());
    const [r, g, b] = [0, 1, 2].map((i) => Number(parts[i]));
    return { rgb: [r, g, b], alpha: parts[3] === undefined ? 1 : Number(parts[3]) };
  }
  throw new Error(`Unsupported color value: ${value}`);
}

function blend(fg, bg) {
  // Opaque colors are used as-is; translucent colors must be composited
  // over an explicit backdrop (e.g. the CTA section background).
  if (Array.isArray(fg)) return fg;
  assert.ok(bg !== undefined, "translucent color must be composited over a backdrop");
  return over(fg, bg);
}

function over(fg, bg) {
  const [fr, fg2, fb] = fg.rgb ?? fg;
  const alpha = fg.alpha ?? 1;
  if (alpha === 1) return [fr, fg2, fb];
  return [0, 1, 2].map((i) => Math.round(alpha * (fg.rgb ?? fg)[i] + (1 - alpha) * bg[i]));
}

function channelLuminance(c) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance([r, g, b]) {
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function rootVars(css) {
  const block = css.match(/:root\s*\{([\s\S]*?)\}/)?.[1];
  assert.ok(block, "globals.css must declare :root variables");
  return Object.fromEntries(
    [...block.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)].map((match) => [match[1], match[2].trim()])
  );
}

function ruleDeclarations(css, selector) {
  const pattern = new RegExp(
    `\\.${selector.split(".").filter(Boolean).map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\.")}\\s*\\{([^}]*)\\}`,
    "m"
  );
  const match = css.match(pattern);
  assert.ok(match, `rule for "${selector}" must exist in globals.css`);
  return Object.fromEntries(
    [...match[1].matchAll(/([\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()])
  );
}

const SECTION_SELECTOR = ".dealer-program-cta";
const PRIMARY_SELECTOR = ".dealer-program-cta .button-primary";
const SECONDARY_SELECTOR = ".dealer-program-cta .button-secondary";
const FOCUS_SELECTOR = ".dealer-program-cta .button:focus-visible";

test("dealer-program CTA section is dark so white button text is safe", async () => {
  const css = await readFile(CSS_PATH, "utf8");
  const vars = rootVars(css);
  const section = ruleDeclarations(css, SECTION_SELECTOR);
  const sectionBg = parseColor(section.background, vars);
  assert.ok(luminance(sectionBg) < 0.2, "CTA section background must be dark");
});

test("secondary CTA is never white-on-white and text meets AA on the ink section", async () => {
  const css = await readFile(CSS_PATH, "utf8");
  const vars = rootVars(css);
  const sectionBg = parseColor(ruleDeclarations(css, SECTION_SELECTOR).background, vars);
  const secondary = ruleDeclarations(css, SECONDARY_SELECTOR);

  // Regression: the base .button-secondary paints a white background, so the
  // CTA override must explicitly clear it (transparent) before it may use
  // white text. A missing transparent would compute to 1:1 contrast.
  assert.equal(secondary.background, "transparent", "secondary CTA must clear the inherited white background");

  const textColor = parseColor(secondary.color, vars);
  const ratio = contrast(blend(textColor), sectionBg);
  assert.ok(ratio >= 4.5, `secondary CTA text must be >= 4.5:1 on the ink section (got ${ratio.toFixed(2)}:1)`);

  const borderColor = parseColor(secondary["border-color"], vars);
  const borderOnSection = over(borderColor, sectionBg);
  const borderRatio = contrast(borderOnSection, sectionBg);
  assert.ok(borderRatio >= 3, `secondary CTA border must be >= 3:1 (got ${borderRatio.toFixed(2)}:1)`);
});

test("primary CTA text and boundary meet AA on the ink section", async () => {
  const css = await readFile(CSS_PATH, "utf8");
  const vars = rootVars(css);
  const sectionBg = parseColor(ruleDeclarations(css, SECTION_SELECTOR).background, vars);
  const primary = ruleDeclarations(css, PRIMARY_SELECTOR);

  const bg = parseColor(primary.background, vars);
  const text = parseColor(primary.color, vars);
  const textRatio = contrast(blend(text), blend(bg));
  assert.ok(textRatio >= 4.5, `primary CTA text must be >= 4.5:1 on its background (got ${textRatio.toFixed(2)}:1)`);

  const boundaryRatio = contrast(bg, sectionBg);
  assert.ok(boundaryRatio >= 3, `primary CTA boundary must be >= 3:1 vs the ink section (got ${boundaryRatio.toFixed(2)}:1)`);
});

test("primary CTA background must not reuse the ink section color (invisible boundary regression)", async () => {
  const css = await readFile(CSS_PATH, "utf8");
  const vars = rootVars(css);
  const sectionBg = parseColor(ruleDeclarations(css, SECTION_SELECTOR).background, vars);
  const primary = ruleDeclarations(css, PRIMARY_SELECTOR);
  const bg = parseColor(primary.background, vars);
  assert.ok(contrast(bg, sectionBg) >= 3, "primary CTA must stay visually distinct from the ink section");
});

test("CTA focus-visible ring is visible on the ink section (>= 3:1)", async () => {
  const css = await readFile(CSS_PATH, "utf8");
  const vars = rootVars(css);
  const sectionBg = parseColor(ruleDeclarations(css, SECTION_SELECTOR).background, vars);
  const focus = ruleDeclarations(css, FOCUS_SELECTOR);
  const ring = parseColor(focus["outline-color"], vars);
  const ratio = contrast(ring, sectionBg);
  assert.ok(ratio >= 3, `CTA focus ring must be >= 3:1 on the ink section (got ${ratio.toFixed(2)}:1)`);
});
