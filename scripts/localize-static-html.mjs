import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { getLocaleRoutePair } from "../src/lib/i18n/routes.ts";
import { publicUrl } from "../src/lib/seo/site.ts";

const outDirectory = join(process.cwd(), "out");
const frenchDirectory = join(outDirectory, "fr");
const frenchDocumentLanguage = '<html lang="fr-CA"';
const englishDocumentLanguage = '<html lang="en-CA"';

if (!existsSync(frenchDirectory)) {
  throw new Error("French static output is missing. Run next build before localization.");
}

function findHtmlFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return findHtmlFiles(path);
    return entry.name.endsWith(".html") ? [path] : [];
  });
}

function routeFromFile(file) {
  const route = relative(outDirectory, file).split(sep).join("/").replace(/\/index\.html$/, "");
  return route ? `/${route}` : "/";
}

function replaceOrAppendHeadTag(html, pattern, tag) {
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace("</head>", `${tag}</head>`);
}

const excludedFrenchPreview = join(frenchDirectory, "v1-1", "index.html");
if (existsSync(excludedFrenchPreview)) {
  rmSync(join(frenchDirectory, "v1-1"), { recursive: true, force: true });
}

const frenchHtmlFiles = findHtmlFiles(frenchDirectory);
if (frenchHtmlFiles.length === 0) {
  throw new Error("French static output contains no HTML files to localize.");
}

for (const file of frenchHtmlFiles) {
  const sourceHtml = readFileSync(file, "utf8");
  const occurrences = sourceHtml.split(englishDocumentLanguage).length - 1;
  if (occurrences !== 1) {
    throw new Error(
      `Expected exactly one en-CA document language in ${relative(outDirectory, file)}, found ${occurrences}.`
    );
  }

  const route = routeFromFile(file);
  const pair = getLocaleRoutePair(route);
  if (!pair) {
    throw new Error(`French HTML route is absent from the locale manifest: ${route}`);
  }

  const canonical = publicUrl(pair.fr);
  const englishAlternate = publicUrl(pair.en);

  let html = sourceHtml.replace(englishDocumentLanguage, frenchDocumentLanguage);
  if (canonical && englishAlternate) {
    html = html
      .replace(/<link rel="canonical"[^>]*>/g, "")
      .replace(/<link rel="alternate"[^>]*>/g, "");
    html = html.replace(
      "</head>",
      `<link rel="canonical" href="${canonical}"/>` +
        `<link rel="alternate" hrefLang="en-CA" href="${englishAlternate}"/>` +
        `<link rel="alternate" hrefLang="fr-CA" href="${canonical}"/>` +
        `<link rel="alternate" hrefLang="x-default" href="${englishAlternate}"/>` +
        "</head>"
    );
  }
  html = replaceOrAppendHeadTag(
    html,
    /<meta name="content-language"[^>]*>/,
    '<meta name="content-language" content="fr-CA"/>'
  );
  html = replaceOrAppendHeadTag(
    html,
    /<meta property="og:locale"[^>]*>/,
    '<meta property="og:locale" content="fr_CA"/>'
  );
  if (canonical) {
    html = replaceOrAppendHeadTag(
      html,
      /<meta property="og:url"[^>]*>/,
      `<meta property="og:url" content="${canonical}"/>`
    );
  }
  if (!pair.indexable) {
    html = replaceOrAppendHeadTag(
      html,
      /<meta name="robots"[^>]*>/,
      '<meta name="robots" content="noindex, nofollow, noarchive"/>'
    );
  }

  writeFileSync(file, html);
}

const invalidFiles = frenchHtmlFiles.filter((file) => {
  const html = readFileSync(file, "utf8");
  const route = routeFromFile(file);
  const pair = getLocaleRoutePair(route);
  const canonical = pair ? publicUrl(pair.fr) : null;
  return (
    !html.includes(frenchDocumentLanguage) ||
    html.includes(englishDocumentLanguage) ||
    (canonical !== null && !html.includes(`rel="canonical" href="${canonical}"`)) ||
    !html.includes('name="content-language" content="fr-CA"')
  );
});

if (invalidFiles.length > 0) {
  throw new Error(
    `French HTML localization verification failed: ${invalidFiles
      .map((file) => relative(outDirectory, file))
      .join(", ")}`
  );
}

console.log(`Localized and verified ${frenchHtmlFiles.length} French static HTML file(s) as fr-CA.`);
