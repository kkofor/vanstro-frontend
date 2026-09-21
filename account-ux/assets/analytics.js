/* First-party analytics beacon for the ops console (admin › Traffic / SEO).
   Sends one pageview per page load, named events, and Core Web Vitals to POST /api/track.
   Stores nothing personal: a random visitor id in localStorage, a per-tab session id,
   path, referrer host, UTM tags, ad click id *name* (not value), language. The server hashes the IP.
   Skips staff sessions.
   Usage: VSTrack.event('add_to_cart', { sku: 'HW-…' }) */
window.VSTrack = (function () {
  const VID = 'vs.vid', SID = 'vs.sid', SID_AT = 'vs.sid.at', UTM = 'vs.utm', CLICK = 'vs.click';
  const SESSION_GAP = 30 * 60 * 1000;
  const CLICK_IDS = ['gclid', 'msclkid', 'fbclid', 'ttclid', 'li_fat_id', 'twclid'];
  function rid() {
    try { return crypto.randomUUID(); } catch (e) { return 'v' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36); }
  }
  function vid() {
    try { let v = localStorage.getItem(VID); if (!v) { v = rid(); localStorage.setItem(VID, v); } return v; } catch (e) { return 'anon-' + rid(); }
  }
  function sid() {
    try {
      const at = Number(sessionStorage.getItem(SID_AT) || 0);
      let s = sessionStorage.getItem(SID);
      if (!s || Date.now() - at > SESSION_GAP) { s = rid(); sessionStorage.setItem(SID, s); sessionStorage.removeItem(UTM); sessionStorage.removeItem(CLICK); }
      sessionStorage.setItem(SID_AT, String(Date.now()));
      return s;
    } catch (e) { return 'tab-' + rid(); }
  }
  function utm() {
    const q = new URLSearchParams(location.search);
    const o = {};
    ['source', 'medium', 'campaign', 'term', 'content'].forEach(k => { const v = q.get('utm_' + k); if (v) o[k] = v.slice(0, 120); });
    try {
      if (Object.keys(o).length) sessionStorage.setItem(UTM, JSON.stringify(o));
      else { const s = sessionStorage.getItem(UTM); if (s) return JSON.parse(s); }
    } catch (e) {}
    return o;
  }
  function click() {
    const q = new URLSearchParams(location.search);
    const hit = CLICK_IDS.find(k => q.has(k));
    try {
      if (hit) sessionStorage.setItem(CLICK, hit);
      else return sessionStorage.getItem(CLICK) || undefined;
    } catch (e) {}
    return hit || undefined;
  }
  function staff() {
    try { const s = JSON.parse(localStorage.getItem('vs.session') || 'null'); return !!(s && s.role === 'staff'); } catch (e) { return false; }
  }
  function headers() { return window.VSSession ? VSSession.headers() : {}; }
  function send(body) {
    if (staff()) return;
    const payload = Object.assign({
      path: location.pathname, ref: document.referrer || '', utm: utm(), click: click(), vid: vid(), sid: sid(),
      lang: (document.documentElement.lang || navigator.language || '').slice(0, 12),
    }, body);
    try {
      fetch('/api/track', { method: 'POST', keepalive: true, headers: Object.assign({ 'content-type': 'application/json' }, headers()), body: JSON.stringify(payload) }).catch(() => {});
    } catch (e) {}
  }
  function pageview() { send({ type: 'pageview' }); }
  function event(name, data) { if (!name) return; send({ type: 'event', name: String(name).slice(0, 40), data: data || undefined }); }

  /* Core Web Vitals (LCP, CLS, INP, FCP, TTFB) — sent once when the page is hidden / unloaded. */
  function vitals() {
    const v = {};
    let sent = false;
    try {
      const nav = performance.getEntriesByType('navigation')[0];
      if (nav) v.ttfb = Math.round(nav.responseStart);
      new PerformanceObserver(l => { const e = l.getEntries().pop(); if (e) v.lcp = Math.round(e.startTime); }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver(l => { l.getEntries().forEach(e => { if (e.name === 'first-contentful-paint') v.fcp = Math.round(e.startTime); }); }).observe({ type: 'paint', buffered: true });
      let cls = 0;
      new PerformanceObserver(l => { l.getEntries().forEach(e => { if (!e.hadRecentInput) cls += e.value; }); v.cls = Math.round(cls * 1000) / 1000; }).observe({ type: 'layout-shift', buffered: true });
      const durations = [];
      new PerformanceObserver(l => { l.getEntries().forEach(e => { if (e.interactionId) durations.push(e.duration); }); if (durations.length) { durations.sort((a, b) => b - a); v.inp = Math.round(durations[Math.min(durations.length - 1, Math.floor(durations.length / 50))]); } }).observe({ type: 'event', buffered: true, durationThreshold: 40 });
    } catch (e) { /* older browser */ }
    const flush = () => { if (sent || !Object.keys(v).length) return; sent = true; event('vitals', v); };
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
    window.addEventListener('pagehide', flush);
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(pageview, 0);
  else document.addEventListener('DOMContentLoaded', pageview);
  vitals();
  return { event, pageview };
})();
