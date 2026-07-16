import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";

const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const root = "http://127.0.0.1:3003";
const out = new URL("./", import.meta.url);
const port = 9341;
const profile = "/tmp/vanstro-g7-rework-chrome-profile";
const routes = [
  { name: "home", path: "/" },
  { name: "alternate-home", path: "/v1-1/" },
  { name: "catalog", path: "/products/" },
  { name: "pdp", path: "/products/3-drawer-base-3db12-272/" },
  { name: "article", path: "/articles/how-to-measure-for-cabinets/" },
  { name: "dashboard", path: "/dashboard/" }
];
const profiles = [
  { name: "desktop", width: 1440, height: 900, mobile: false, deviceScaleFactor: 1, latency: 40, download: 10_000_000 / 8, upload: 5_000_000 / 8, cpu: 1 },
  { name: "mobile", width: 390, height: 844, mobile: true, deviceScaleFactor: 2, latency: 150, download: 1_600_000 / 8, upload: 750_000 / 8, cpu: 4 }
];

await mkdir(out, { recursive: true });
const chrome = spawn(chromePath, [
  "--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  "--disable-background-networking", "--disable-component-update", "--disable-default-apps",
  "--disable-extensions", "--disable-sync", "--metrics-recording-only", "--no-first-run",
  "--hide-scrollbars", "about:blank"
], { stdio: ["ignore", "ignore", "pipe"] });

async function waitForJson(url, attempts = 100) {
  let last;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch (error) { last = error; }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw last || new Error(`Timed out waiting for ${url}`);
}

let ws;
try {
  await waitForJson(`http://127.0.0.1:${port}/json/version`);
  const target = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" }).then((response) => response.json());
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.addEventListener("open", resolve, { once: true }); ws.addEventListener("error", reject, { once: true }); });

  let id = 0;
  const pending = new Map();
  const listeners = new Map();
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const callback = pending.get(message.id);
      if (callback) { pending.delete(message.id); message.error ? callback.reject(message.error) : callback.resolve(message.result); }
      return;
    }
    for (const callback of listeners.get(message.method) || []) callback(message.params || {});
  });

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const messageId = ++id;
    pending.set(messageId, { resolve, reject });
    ws.send(JSON.stringify({ id: messageId, method, params }));
  });
  const once = (method, timeoutMs = 60000) => new Promise((resolve, reject) => {
    const callbacks = listeners.get(method) || [];
    const callback = (params) => { clearTimeout(timer); listeners.set(method, callbacks.filter((item) => item !== callback)); resolve(params); };
    callbacks.push(callback);
    listeners.set(method, callbacks);
    const timer = setTimeout(() => { listeners.set(method, callbacks.filter((item) => item !== callback)); reject(new Error(`Timed out waiting for ${method}`)); }, timeoutMs);
  });

  await Promise.all([send("Page.enable"), send("Network.enable"), send("Runtime.enable"), send("Performance.enable")]);
  await send("Page.addScriptToEvaluateOnNewDocument", { source: `
    window.__g7 = { cls: 0, lcp: null, longTasks: [] };
    try { new PerformanceObserver((list) => { for (const e of list.getEntries()) if (!e.hadRecentInput) window.__g7.cls += e.value; }).observe({type:'layout-shift', buffered:true}); } catch {}
    try { new PerformanceObserver((list) => { const entries=list.getEntries(); const e=entries[entries.length-1]; if(e) window.__g7.lcp={startTime:e.startTime,size:e.size,url:e.url||null,element:e.element?.tagName||null}; }).observe({type:'largest-contentful-paint', buffered:true}); } catch {}
    try { new PerformanceObserver((list) => { for (const e of list.getEntries()) window.__g7.longTasks.push({startTime:e.startTime,duration:e.duration}); }).observe({type:'longtask', buffered:true}); } catch {}
  ` });

  const results = [];
  for (const profileConfig of profiles) {
    await send("Emulation.setDeviceMetricsOverride", { width: profileConfig.width, height: profileConfig.height, mobile: profileConfig.mobile, deviceScaleFactor: profileConfig.deviceScaleFactor });
    await send("Emulation.setCPUThrottlingRate", { rate: profileConfig.cpu });
    await send("Network.emulateNetworkConditions", { offline: false, latency: profileConfig.latency, downloadThroughput: profileConfig.download, uploadThroughput: profileConfig.upload, connectionType: profileConfig.mobile ? "cellular4g" : "wifi" });
    await send("Network.setCacheDisabled", { cacheDisabled: true });

    for (const route of routes) {
      await send("Network.clearBrowserCache");
      const requests = new Map();
      const responseHandler = (params) => requests.set(params.requestId, {
        url: params.response.url, status: params.response.status, mimeType: params.response.mimeType,
        protocol: params.response.protocol, fromDiskCache: params.response.fromDiskCache,
        fromServiceWorker: params.response.fromServiceWorker, headers: params.response.headers,
        encodedDataLength: params.response.encodedDataLength
      });
      const finishHandler = (params) => {
        const request = requests.get(params.requestId);
        if (request) request.encodedDataLength = params.encodedDataLength;
      };
      listeners.set("Network.responseReceived", [...(listeners.get("Network.responseReceived") || []), responseHandler]);
      listeners.set("Network.loadingFinished", [...(listeners.get("Network.loadingFinished") || []), finishHandler]);

      const loaded = once("Page.loadEventFired", 120000);
      const startedAt = Date.now();
      await send("Page.navigate", { url: `${root}${route.path}` });
      await loaded;
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const wallLoadMs = Date.now() - startedAt;

      listeners.set("Network.responseReceived", (listeners.get("Network.responseReceived") || []).filter((item) => item !== responseHandler));
      listeners.set("Network.loadingFinished", (listeners.get("Network.loadingFinished") || []).filter((item) => item !== finishHandler));

      const evaluated = await send("Runtime.evaluate", { returnByValue: true, expression: `(() => {
        const nav = performance.getEntriesByType('navigation')[0];
        const paints = Object.fromEntries(performance.getEntriesByType('paint').map(e => [e.name, e.startTime]));
        const resources = performance.getEntriesByType('resource').map(e => ({name:e.name,initiatorType:e.initiatorType,duration:e.duration,transferSize:e.transferSize,encodedBodySize:e.encodedBodySize,decodedBodySize:e.decodedBodySize,renderBlockingStatus:e.renderBlockingStatus||null}));
        const images = [...document.images].map(img => { const r=img.getBoundingClientRect(); return {src:img.currentSrc||img.src,loading:img.loading||'auto',fetchPriority:img.fetchPriority||'auto',complete:img.complete,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,renderedWidth:r.width,renderedHeight:r.height,objectFit:getComputedStyle(img).objectFit,aboveFold:r.top<innerHeight&&r.bottom>0}; });
        const scripts=[...document.scripts].map(s=>({src:s.src,type:s.type,async:s.async,defer:s.defer})).filter(s=>s.src);
        const styles=[...document.querySelectorAll('link[rel="stylesheet"]')].map(l=>({href:l.href,media:l.media||'all'}));
        const longTasks=window.__g7?.longTasks||[];
        return {url:location.href,title:document.title,readyState:document.readyState,nav:nav?{responseStart:nav.responseStart,domInteractive:nav.domInteractive,domContentLoadedEventEnd:nav.domContentLoadedEventEnd,loadEventEnd:nav.loadEventEnd,duration:nav.duration,transferSize:nav.transferSize,encodedBodySize:nav.encodedBodySize,decodedBodySize:nav.decodedBodySize}:null,paints,lcp:window.__g7?.lcp||null,cls:window.__g7?.cls??null,longTaskCount:longTasks.length,totalBlockingTime:longTasks.reduce((s,e)=>s+Math.max(0,e.duration-50),0),resources,images,scripts,styles,fontStatus:document.fonts?.status||null,fontFaces:document.fonts?[...document.fonts].map(f=>({family:f.family,status:f.status})):[]};
      })()` });
      const metrics = await send("Performance.getMetrics");
      const network = [...requests.values()];
      const value = evaluated.result.value;
      value.network = {
        requestCount: network.length,
        encodedBytes: network.reduce((sum, item) => sum + (item.encodedDataLength || 0), 0),
        byMime: Object.fromEntries([...new Set(network.map((item) => item.mimeType))].sort().map((mime) => [mime, { count: network.filter((item) => item.mimeType === mime).length, bytes: network.filter((item) => item.mimeType === mime).reduce((sum, item) => sum + (item.encodedDataLength || 0), 0) }])),
        requests: network
      };
      value.cdpMetrics = Object.fromEntries(metrics.metrics.map((item) => [item.name, item.value]));
      value.profile = profileConfig;
      value.route = route;
      value.wallLoadMs = wallLoadMs;
      results.push(value);

      if (["home", "catalog", "pdp"].includes(route.name)) {
        const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
        await writeFile(new URL(`screenshot-${profileConfig.name}-${route.name}.png`, out), Buffer.from(shot.data, "base64"));
      }
      console.log(`${profileConfig.name} ${route.name}: FCP=${Math.round(value.paints["first-contentful-paint"] || 0)} LCP=${Math.round(value.lcp?.startTime || 0)} CLS=${value.cls} requests=${value.network.requestCount}`);
    }
  }

  await writeFile(new URL("browser-performance.json", out), JSON.stringify({
    observedAt: new Date().toISOString(),
    method: "Chrome DevTools Protocol against the current local static export, disabled cache per route, desktop and Lighthouse-like mobile throttling; single run per route/profile",
    limitations: ["Single lab run, not field CrUX data", "INP unavailable because no representative interaction was executed", "LCP and CLS are PerformanceObserver values captured two seconds after load", "Network conditions are synthetic and local machine load is uncontrolled"],
    results
  }, null, 2));
} finally {
  if (ws?.readyState === WebSocket.OPEN) ws.close();
  chrome.kill("SIGTERM");
}
