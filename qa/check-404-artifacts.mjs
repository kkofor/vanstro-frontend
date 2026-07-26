import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const out = join(process.cwd(), "out");
const english = readFileSync(join(out, "404.html"), "utf8");
const french = readFileSync(join(out, "fr", "404", "index.html"), "utf8");

assert(english.includes('<html lang="en-CA"'), "Global 404 must be an English document");
assert(english.includes("This page could not be found"), "Global 404 must contain English content");
assert(!english.includes("Cette page est introuvable"), "Global 404 must not contain hidden French content");
assert(english.includes('name="robots" content="noindex, nofollow, noarchive"'), "Global 404 must be noindex");

assert(french.includes('<html lang="fr-CA"'), "French 404 must be a French document");
assert(french.includes("Cette page est introuvable"), "French 404 must contain French content");
assert(!french.match(/<h1>[^<]*This page could not be found/), "French 404 must not render English content");
assert(french.includes('<title>Page introuvable | VanStro Global Supply</title>'), "French 404 must have French metadata");
assert(french.includes('name="description" content="La page demandée est introuvable.'), "French 404 must have a French description");
assert(french.includes('name="robots" content="noindex, nofollow, noarchive"'), "French 404 must be noindex");
assert(french.includes('hrefLang="en-CA" href="/404/"'), "French 404 language switch must target the English 404");

console.log("404 artifact checks passed: isolated EN/FR content, metadata, noindex, and language counterparts.");
