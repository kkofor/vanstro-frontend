// tsconfig-paths-hook.mjs
//
// Minimal Node ESM resolve hook that maps the tsconfig `@/*` path alias to
// `<repoRoot>/src/*`. Registered at runtime by scripts that import frontend
// source modules (e.g. src/lib/data/mb01-products.ts) under plain
// `node --experimental-strip-types`, where tsconfig paths are not applied.
//
// The repo root is derived from this hook's own location (<root>/scripts/), so
// resolution is independent of the process working directory. Bare alias
// specifiers (no extension, e.g. "@/lib/assets") are tried with `.ts`, `.tsx`
// and `/index.ts` suffixes — mirroring tsconfig `moduleResolution: bundler`.
import { pathToFileURL } from "node:url";

const rootUrl = new URL("../", import.meta.url);

export async function resolve(specifier, context, nextResolve) {
  if (!specifier.startsWith("@/")) return nextResolve(specifier, context);
  const base = new URL(`src/${specifier.slice(2)}`, rootUrl).href;
  const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`];
  for (const candidate of candidates) {
    try {
      return await nextResolve(candidate, context);
    } catch (error) {
      if (error?.code !== "ERR_MODULE_NOT_FOUND") throw error;
    }
  }
  return nextResolve(base, context); // surface the original resolution error
}
