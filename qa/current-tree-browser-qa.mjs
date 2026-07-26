#!/usr/bin/env node

import { spawn } from "node:child_process";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { dirname, join, resolve } from "node:path";
import process from "node:process";

const ROOT = resolve(import.meta.dirname, "..");
const OUT_DIR = resolve(process.env.VANSTRO_QA_OUT_DIR ?? join(ROOT, "out"));
const REPORT_PATH = resolve(
  process.env.VANSTRO_QA_REPORT ?? join(ROOT, "tmp", "browser-qa", "report.json")
);
const HOST = "127.0.0.1";
const SERVER_PORT = Number(process.env.VANSTRO_QA_PORT ?? 4173);
const BASE_URL = process.env.VANSTRO_QA_BASE_URL ?? `http://${HOST}:${SERVER_PORT}`;
const TIMEOUT_MS = Number(process.env.VANSTRO_QA_TIMEOUT_MS ?? 30_000);
const STATIC_ORIGIN = new URL(BASE_URL).origin;
const EXTERNAL_API_ORIGINS = new Set(
  (process.env.VANSTRO_QA_EXTERNAL_API_ORIGINS ?? "https://api.vanstro.ca")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => new URL(origin).origin)
);

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser"
].filter(Boolean);

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 1000, mobile: false, deviceScaleFactor: 1 },
  { name: "mobile", width: 390, height: 844, mobile: true, deviceScaleFactor: 2 }
];

const DEFAULT_ROUTE_PAIRS = [
  ["/", "/fr/"],
  ["/about/", "/fr/about/"],
  ["/products/", "/fr/products/"],
  ["/products/base-cabinet-b12-252/", "/fr/products/base-cabinet-b12-252/"],
  ["/articles/", "/fr/articles/"],
  ["/articles/how-to-measure-for-cabinets/", "/fr/articles/how-to-measure-for-cabinets/"],
  ["/dealers/map/", "/fr/dealers/map/"],
  ["/contact/", "/fr/contact/"],
  ["/account/login/", "/fr/account/login/"]
];

function routePairs() {
  if (!process.env.VANSTRO_QA_ROUTE_PAIRS) return DEFAULT_ROUTE_PAIRS;
  return process.env.VANSTRO_QA_ROUTE_PAIRS.split(",").map((pair) => {
    const [en, fr] = pair.split("|");
    if (!en || !fr) throw new Error(`Invalid route pair: ${pair}`);
    return [en, fr];
  });
}

function delay(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

async function stopChild(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const exited = new Promise((resolveExit) => child.once("exit", resolveExit));
  child.kill("SIGTERM");
  await Promise.race([exited, delay(2_000)]);
}

async function freePort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, HOST, () => {
      const address = server.address();
      server.close(() => resolvePort(address.port));
    });
  });
}

async function executablePath() {
  for (const candidate of CHROME_CANDIDATES) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next common browser location.
    }
  }
  throw new Error("No Chrome, Chromium, or Edge executable found. Set CHROME_PATH.");
}

async function waitForUrl(url, timeout = TIMEOUT_MS) {
  const deadline = Date.now() + timeout;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
      lastError = new Error(`${response.status} ${response.statusText}`);
    } catch (error) {
      lastError = error;
    }
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError?.message ?? "unknown error"}`);
}

class CdpConnection {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    this.ready = new Promise((resolveReady, reject) => {
      this.socket.addEventListener("open", resolveReady, { once: true });
      this.socket.addEventListener("error", () => reject(new Error(`CDP connection failed: ${url}`)), {
        once: true
      });
    });
    this.socket.addEventListener("message", ({ data }) => this.handle(JSON.parse(data)));
    this.socket.addEventListener("close", () => {
      for (const { reject } of this.pending.values()) reject(new Error("CDP connection closed"));
      this.pending.clear();
    });
  }

  handle(message) {
    if (message.id) {
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
      return;
    }
    for (const listener of this.listeners.get(message.method) ?? []) listener(message.params ?? {});
  }

  on(method, listener) {
    const listeners = this.listeners.get(method) ?? [];
    listeners.push(listener);
    this.listeners.set(method, listeners);
  }

  async send(method, params = {}) {
    await this.ready;
    const id = this.nextId++;
    return new Promise((resolveResult, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP timeout: ${method}`));
      }, TIMEOUT_MS);
      this.pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer);
          resolveResult(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        }
      });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.socket.close();
  }
}

async function waitForLoad(cdp) {
  return new Promise((resolveLoad, reject) => {
    const timer = setTimeout(() => reject(new Error("Page load timed out")), TIMEOUT_MS);
    cdp.on("Page.loadEventFired", () => {
      clearTimeout(timer);
      setTimeout(resolveLoad, 300);
    });
  });
}

function normalizePath(value) {
  const pathname = new URL(value, BASE_URL).pathname;
  return pathname === "/" ? "/" : `${pathname.replace(/\/+$/, "")}/`;
}

function failureBoundary(failure) {
  if (!failure.url) return "unknown";
  try {
    const origin = new URL(failure.url, BASE_URL).origin;
    if (origin === STATIC_ORIGIN) return "same-origin";
    if (EXTERNAL_API_ORIGINS.has(origin)) return "external-api";
    return "external-other";
  } catch {
    return "unknown";
  }
}

function classifyFailures(failures) {
  return failures.reduce((classified, failure) => {
    classified[failureBoundary(failure)].push(failure);
    return classified;
  }, { "same-origin": [], "external-api": [], "external-other": [], unknown: [] });
}

async function inspectRoute(debugPort, route, counterpart, viewport) {
  const targetResponse = await fetch(`http://${HOST}:${debugPort}/json/new?${encodeURIComponent("about:blank")}`, {
    method: "PUT"
  });
  if (!targetResponse.ok) throw new Error(`Could not create Chrome target: ${targetResponse.status}`);
  const target = await targetResponse.json();
  const cdp = new CdpConnection(target.webSocketDebuggerUrl);
  const consoleIssues = [];
  const httpFailures = [];
  const requestFailures = [];
  const requestUrls = new Map();
  const pageErrors = [];

  cdp.on("Runtime.consoleAPICalled", ({ type, args = [] }) => {
    if (!["error", "assert", "warning"].includes(type)) return;
    consoleIssues.push({ type, text: args.map((arg) => arg.value ?? arg.description ?? "").join(" ") });
  });
  cdp.on("Runtime.exceptionThrown", ({ exceptionDetails }) => {
    pageErrors.push(exceptionDetails.exception?.description ?? exceptionDetails.text ?? "Uncaught exception");
  });
  cdp.on("Network.requestWillBeSent", ({ requestId, request }) => {
    requestUrls.set(requestId, request.url);
  });
  cdp.on("Network.responseReceived", ({ response }) => {
    if (response.status >= 400) httpFailures.push({ status: response.status, url: response.url });
  });
  cdp.on("Network.loadingFailed", ({ requestId, errorText, blockedReason, canceled, type }) => {
    if (!canceled) {
      requestFailures.push({
        url: requestUrls.get(requestId) ?? null,
        errorText,
        blockedReason: blockedReason ?? null,
        type
      });
    }
  });

  try {
    await Promise.all([
      cdp.send("Page.enable"),
      cdp.send("Runtime.enable"),
      cdp.send("Network.enable"),
      cdp.send("Emulation.setDeviceMetricsOverride", {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: viewport.deviceScaleFactor,
        mobile: viewport.mobile
      })
    ]);
    const loaded = waitForLoad(cdp);
    const navigation = await cdp.send("Page.navigate", { url: `${BASE_URL}${route.replace(/^\//, "/")}` });
    if (navigation.errorText) throw new Error(navigation.errorText);
    await loaded;

    const { result } = await cdp.send("Runtime.evaluate", {
      returnByValue: true,
      expression: `(() => {
        const canonical = document.querySelector('link[rel="canonical"]')?.href ?? null;
        const alternates = [...document.querySelectorAll('link[rel="alternate"][hreflang]')]
          .map((node) => ({ lang: node.hreflang, href: node.href }));
        const switchLink = [...document.querySelectorAll('a[href]')]
          .find((node) => node.hreflang === ${JSON.stringify(route.startsWith("/fr") ? "en-CA" : "fr-CA")});
        const root = document.documentElement;
        const overflow = Math.max(0, root.scrollWidth - root.clientWidth);
        const bodyText = document.body?.innerText ?? "";
        return {
          url: location.href,
          statusReady: document.readyState,
          title: document.title,
          lang: root.lang,
          overflow,
          canonical,
          alternates,
          switchHref: switchLink?.href ?? null,
          hydrationMarkers: bodyText.match(/hydration failed|hydration mismatch|server rendered html/i)?.[0] ?? null
        };
      })()`
    });
    const dom = result.value;
    const expectedLang = route.startsWith("/fr") ? "fr-CA" : "en-CA";
    const expectedCanonicalPath = normalizePath(route);
    const expectedSwitchPath = normalizePath(counterpart);
    const alternateMap = Object.fromEntries(dom.alternates.map(({ lang, href }) => [lang, normalizePath(href)]));
    const classifiedHttpFailures = classifyFailures(httpFailures);
    const classifiedRequestFailures = classifyFailures(requestFailures);
    const assertions = {
      documentComplete: dom.statusReady === "complete",
      titlePresent: Boolean(dom.title.trim()),
      lang: dom.lang === expectedLang,
      noHorizontalOverflow: dom.overflow <= 2,
      canonical: Boolean(dom.canonical) && normalizePath(dom.canonical) === expectedCanonicalPath,
      hreflangEn: alternateMap["en-CA"] === normalizePath(route.startsWith("/fr") ? counterpart : route),
      hreflangFr: alternateMap["fr-CA"] === normalizePath(route.startsWith("/fr") ? route : counterpart),
      switchPath: Boolean(dom.switchHref) && normalizePath(dom.switchHref) === expectedSwitchPath,
      noHydrationMarker: dom.hydrationMarkers === null,
      noConsoleIssues: consoleIssues.length === 0,
      noPageErrors: pageErrors.length === 0,
      noSameOriginHttpFailures: classifiedHttpFailures["same-origin"].length === 0,
      noSameOriginRequestFailures: classifiedRequestFailures["same-origin"].length === 0,
      noUnexpectedExternalHttpFailures:
        classifiedHttpFailures["external-other"].length === 0 && classifiedHttpFailures.unknown.length === 0,
      noUnexpectedExternalRequestFailures:
        classifiedRequestFailures["external-other"].length === 0 && classifiedRequestFailures.unknown.length === 0
    };

    return {
      route,
      counterpart,
      viewport: viewport.name,
      passed: Object.values(assertions).every(Boolean),
      assertions,
      observed: dom,
      consoleIssues,
      pageErrors,
      httpFailures,
      requestFailures,
      networkBoundaries: {
        sameOrigin: {
          httpFailures: classifiedHttpFailures["same-origin"],
          requestFailures: classifiedRequestFailures["same-origin"]
        },
        externalApi: {
          available:
            classifiedHttpFailures["external-api"].length === 0 &&
            classifiedRequestFailures["external-api"].length === 0,
          httpFailures: classifiedHttpFailures["external-api"],
          requestFailures: classifiedRequestFailures["external-api"]
        },
        unexpectedExternal: {
          httpFailures: [...classifiedHttpFailures["external-other"], ...classifiedHttpFailures.unknown],
          requestFailures: [...classifiedRequestFailures["external-other"], ...classifiedRequestFailures.unknown]
        }
      }
    };
  } catch (error) {
    return {
      route,
      counterpart,
      viewport: viewport.name,
      passed: false,
      fatalError: error.stack ?? error.message,
      consoleIssues,
      pageErrors,
      httpFailures,
      requestFailures
    };
  } finally {
    cdp.close();
    await fetch(`http://${HOST}:${debugPort}/json/close/${target.id}`, { method: "PUT" }).catch(() => {});
  }
}

let staticServer;
let chrome;
let chromeProfileDir;
let exitCode = 1;
const startedAt = new Date().toISOString();

try {
  await access(join(OUT_DIR, "index.html"));
  const browserPath = await executablePath();
  const debugPort = await freePort();

  if (!process.env.VANSTRO_QA_BASE_URL) {
    staticServer = spawn(process.execPath, [join(ROOT, "qa", "static_server.mjs"), String(SERVER_PORT), OUT_DIR], {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"]
    });
    await waitForUrl(BASE_URL);
  }

  chromeProfileDir = await mkdtemp(join(ROOT, "tmp", "browser-qa", "chrome-profile-"));
  chrome = spawn(browserPath, [
    "--headless=new",
    "--disable-gpu",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-default-apps",
    "--disable-extensions",
    "--disable-sync",
    "--metrics-recording-only",
    "--no-first-run",
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${chromeProfileDir}`,
    "about:blank"
  ], { stdio: ["ignore", "ignore", "pipe"] });
  const versionResponse = await waitForUrl(`http://${HOST}:${debugPort}/json/version`);
  const browserVersion = await versionResponse.json();

  const results = [];
  for (const [en, fr] of routePairs()) {
    for (const viewport of VIEWPORTS) {
      results.push(await inspectRoute(debugPort, en, fr, viewport));
      results.push(await inspectRoute(debugPort, fr, en, viewport));
    }
  }

  const failed = results.filter((result) => !result.passed);
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    startedAt,
    scope: {
      engine: "Chromium only (Chrome DevTools Protocol)",
      browser: browserVersion.Browser,
      protocolVersion: browserVersion["Protocol-Version"],
      baseUrl: BASE_URL,
      outDir: OUT_DIR,
      viewports: VIEWPORTS,
      routePairs: routePairs()
    },
    summary: { total: results.length, passed: results.length - failed.length, failed: failed.length },
    passed: failed.length === 0,
    results
  };
  await mkdir(dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ report: REPORT_PATH, ...report.summary, scope: report.scope.engine }));
  exitCode = failed.length === 0 ? 0 : 1;
} catch (error) {
  await mkdir(dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    startedAt,
    passed: false,
    fatalError: error.stack ?? error.message
  }, null, 2)}\n`);
  console.error(error.stack ?? error.message);
} finally {
  await Promise.all([stopChild(staticServer), stopChild(chrome)]);
  if (chromeProfileDir) await rm(chromeProfileDir, { recursive: true, force: true });
  process.exitCode = exitCode;
}
