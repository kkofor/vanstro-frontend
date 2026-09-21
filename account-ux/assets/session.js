/* Browser helpers. Production auth is the HttpOnly vs_session cookie (credentials: same-origin).
   vs.session localStorage is a prototype leftover — never send x-vs-guest from it.
   x-vs-guest:1 made auth() ignore a valid cookie and treat logged-in users as guests.
   Guests are simply "no cookie"; order access tokens still travel as x-vs-order-token. */
window.VSSession = (function () {
  const KEY = 'vs.session';
  const TOKENS = 'vs.orderTokens';
  function get() {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; }
  }
  function set(s) {
    if (!s) { localStorage.removeItem(KEY); return; }
    localStorage.setItem(KEY, JSON.stringify(s));
  }
  /** Shared by site-header.js [data-sign-out] and account.html #accountSignOut. Always go to the login page (EN / FR), never reload in place. */
  function isFrPath() {
    try {
      const p = location.pathname || "";
      return p === "/fr" || p.indexOf("/fr/") === 0;
    } catch (e) { return false; }
  }
  function loginHref() {
    return isFrPath() ? "/fr/login" : "/account/login";
  }
  function hrefWithExtras(base, el, on) {
    const q = el.getAttribute("data-query");
    if (q) return base + (q.charAt(0) === "?" ? q : "?" + q);
    const redir = el.getAttribute("data-redirect");
    if (!redir) return base;
    let dest = redir;
    if (on && dest.charAt(0) === "/" && dest.indexOf("/fr") !== 0) dest = dest === "/" ? "/fr/" : "/fr" + dest;
    return base + "?redirect=" + encodeURIComponent(dest);
  }
  /** Update .js-home / .js-login / .js-register / .js-forgot / legal links for EN vs FR. */
  function applyAuthHrefs(fr) {
    const on = !!fr;
    document.querySelectorAll(".js-home").forEach(function (a) { a.href = on ? "/fr/" : "/"; });
    document.querySelectorAll(".auth__back").forEach(function (a) {
      a.href = on ? "/fr/" : "/";
      a.textContent = on ? "Retour \u00e0 vanstro.ca" : "Back to vanstro.ca";
    });
    document.querySelectorAll(".js-privacy").forEach(function (a) { a.href = on ? "/fr/privacy" : "/privacy"; });
    document.querySelectorAll(".js-terms").forEach(function (a) { a.href = on ? "/fr/terms-and-conditions" : "/terms-and-conditions"; });
    document.querySelectorAll(".js-help").forEach(function (a) { a.href = on ? "/fr/contact" : "/contact"; });
    document.querySelectorAll(".js-login").forEach(function (a) { a.href = hrefWithExtras(on ? "/fr/login" : "/account/login", a, on); });
    document.querySelectorAll(".js-register").forEach(function (a) { a.href = hrefWithExtras(on ? "/fr/register" : "/account/register", a, on); });
    document.querySelectorAll(".js-forgot").forEach(function (a) { a.href = hrefWithExtras(on ? "/fr/account/forgot-password" : "/account/forgot-password", a, on); });
    document.querySelectorAll(".js-account").forEach(function (a) { a.href = hrefWithExtras(on ? "/fr/account" : "/account", a, on); });
  }
  function signOut() {
    return fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" })
      .catch(function () { return null; })
      .then(function () {
        set(null);
        location.href = loginHref();
      });
  }
  function isSignedIn() { const s = get(); return !!(s && s.userId); }
  function isDealer() { return get() && get().role === 'dealer'; }
  function isStaff() { return get() && get().role === 'staff'; }
  function tokens() {
    try { return JSON.parse(localStorage.getItem(TOKENS) || '{}') || {}; } catch { return {}; }
  }
  function orderToken(orderNo) { return (orderNo && tokens()[orderNo]) || null; }
  function setOrderToken(orderNo, token) {
    if (!orderNo) return;
    const t = tokens();
    if (token) t[orderNo] = token; else delete t[orderNo];
    localStorage.setItem(TOKENS, JSON.stringify(t));
  }
  /* Headers for /api calls. Pass the orderNo when the call is about one order (guest token). */
  function headers(orderNo) {
    const h = {};
    const t = orderToken(orderNo);
    if (t) h['x-vs-order-token'] = t;
    return h;
  }
  return { KEY, get, set, signOut, loginHref, isFrPath, applyAuthHrefs, isSignedIn, isDealer, isStaff, headers, orderToken, setOrderToken, allOrderTokens: tokens };
})();
