import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const LOGIN_SOURCE_URL = new URL("./DashboardLogin.tsx", import.meta.url);
const CSS_URL = new URL("./DashboardLogin.module.css", import.meta.url);

test("Dashboard login form has accessible labels, autocomplete, autofocus and no password echo", async () => {
  const source = await readFile(LOGIN_SOURCE_URL, "utf8");
  // Explicit label/input pairing.
  assert.match(source, /<label htmlFor="dashboard-login-email">/);
  assert.match(source, /<label htmlFor="dashboard-login-password">/);
  assert.match(source, /id="dashboard-login-email"/);
  assert.match(source, /id="dashboard-login-password"/);
  // Correct autocomplete values.
  assert.match(source, /autoComplete="email"/);
  assert.match(source, /autoComplete="current-password"/);
  // Email receives initial focus; the password field never does.
  const emailBlock = source.slice(source.lastIndexOf("<input", source.indexOf('id="dashboard-login-email"')), source.indexOf('id="dashboard-login-email"') + 60);
  const passwordBlock = source.slice(source.lastIndexOf("<input", source.indexOf('id="dashboard-login-password"')), source.indexOf('id="dashboard-login-password"') + 60);
  assert.match(emailBlock, /autoFocus/);
  assert.doesNotMatch(passwordBlock, /autoFocus/);
  // Password is a password control — never echoed into text.
  assert.match(source, /type="password"/);
  assert.doesNotMatch(source, /type="text"[\s\S]*value=\{password\}/);
  // The only `{password}` reference is the input value binding — never text.
  const passwordRefs = source.split("{password}").length - 1;
  const passwordBindings = (source.match(/value=\{password\}/g) ?? []).length;
  assert.equal(passwordRefs, passwordBindings);
  // Keyboard-friendly submit with a busy state that blocks repeat submits.
  assert.match(source, /<button className=\{styles\.submit\} disabled=\{phase === "authenticating"\} type="submit">/);
  // Live regions: alert for errors, status for notices.
  assert.match(source, /id="dashboard-login-error" role="alert"/);
  assert.match(source, /id="dashboard-login-status" role="status"/);
  assert.match(source, /aria-describedby="dashboard-login-error dashboard-login-status"/);
  // Enumeration-safe generic error copy.
  assert.match(source, /invalidCredentials: "邮箱或密码不正确。"/);
});

test("Dashboard login never touches storage, tokens or business transport", async () => {
  const raw = await readFile(LOGIN_SOURCE_URL, "utf8");
  const source = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  // Web Storage policy: the ONLY Web Storage use anywhere in the dashboard
  // session layer is the fixed, non-sensitive, tab-scoped "session expired"
  // notice key owned by src/lib/dashboard/session-notice.ts (short TTL,
  // {type, createdAt, version} only). This login form itself never touches
  // storage — the notice reaches it only through the shell's notice prop —
  // and no token/session credential may ever be persisted to Web Storage.
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
  // No business surface: the login must never mount panels or fetch module data.
  assert.doesNotMatch(source, /DashboardF0ReadOnlyContent|DashboardShell|useDashboardData|PanelRouter|apiFetch|loadTab/);
  // Only the existing cookie session endpoints are used, with credentials include.
  assert.match(source, /dashboardLoginRequest\(DASHBOARD_API_BASE_URL/);
  assert.match(source, /dashboardSessionRequest\(DASHBOARD_API_BASE_URL/);
  assert.match(source, /dashboardLogout\(DASHBOARD_API_BASE_URL\)/);
  // Session verification precedes the authenticated dispatch (never trust the
  // login payload alone for navigation).
  const dispatchIndex = source.indexOf('dispatchDashboardSessionChanged("authenticated")');
  const sessionRequestIndex = source.indexOf("dashboardSessionRequest");
  const restoreCheck = source.indexOf('restore.phase !== "authenticated"');
  assert.ok(sessionRequestIndex !== -1 && dispatchIndex !== -1 && sessionRequestIndex < dispatchIndex, "session re-check must precede the authenticated dispatch");
  assert.ok(restoreCheck !== -1 && restoreCheck < dispatchIndex, "unverified sessions must not dispatch authenticated");
  // Forbidden login outcomes (customer/non-admin/disabled/no dashboard.access)
  // never dispatch authenticated.
  assert.match(source, /if \(restore\.phase === "forbidden"\)/);
  assert.match(source, /setPhase\(\(current\) => dashboardAuthMachine\(current, \{ type: "LOGIN_FORBIDDEN" \}\)\)/);
});

test("Dashboard login machine wiring fences duplicate submits and preserves returnTo", async () => {
  const source = await readFile(LOGIN_SOURCE_URL, "utf8");
  // Only the anonymous phase (or a retried login failure) may start a login.
  assert.match(source, /if \(phase !== "anonymous" && phase !== "unavailable" && phase !== "invalid-response"\) return;/);
  // AbortController fences stale login/session requests on unmount.
  assert.match(source, /controllerRef\.current\?\.abort\(\)/);
  assert.match(source, /useEffect\(\(\) => \(\) => controllerRef\.current\?\.abort\(\), \[\]\)/);
  // Navigation only happens once the foundation boundary is ready for the
  // same actor (session established), and uses the adjudicated returnTo.
  assert.match(source, /if \(phase === "authenticated"\) router\.replace\(returnTo\)/);
  // The returnTo is resolved through dashboardReturnToTarget, which runs
  // both layers (input safety + Authority adjudication) in the shared
  // auth-session helper; unknown/malformed targets fall back to the locale
  // Overview, never a 404. The library's two-layer internals are exercised
  // by auth-session.test.ts.
  assert.match(source, /dashboardReturnToTarget\(current, locale, modules\)/);
  assert.match(source, /dashboardReturnToTarget\(dashboardReturnToFromLoginQuery\(searchParams\.toString\(\)\), locale, modules\)/);
  assert.match(source, /safeDashboardReturnTo/);
  assert.match(source, /adjudicateDashboardReturnTo/);
  assert.match(source, /dashboardDefaultHref\(locale\)/);
  // The login page query is read only for the explicit decoded returnTo
  // value — the login page itself is never a return target. The detection
  // tolerates the trailingSlash-normalized pathname.
  assert.match(source, /const normalizedPathname = pathname\.replace\(\/\\\/\+\$\/, ""\) \|\| "\/"/);
  assert.match(source, /normalizedPathname === dashboardLoginHref\(locale\)/);
  assert.match(source, /dashboardReturnToFromLoginQuery\(searchParams\.toString\(\)\)/);
  // The current business URL is preserved only when both layers accept it.
  assert.match(source, /const current = `\$\{pathname\}\$\{search \? `\?\$\{search\}` : ""\}`/);
  // The expired notice only surfaces through the explicit shell handoff and
  // applies once (never re-applied over later credentials errors).
  assert.match(source, /notice !== "expired"/);
  assert.match(source, /noticeAppliedRef\.current\) return;/);
  // No window.location is ever used for the redirect.
  assert.doesNotMatch(source, /window\.location/);
  // Unmount aborts (AbortError) from the login/session awaits are swallowed —
  // no state updates, no unhandled rejection.
  assert.match(source, /isAbortError\(error\)\) return;/);
  assert.equal((source.match(/if \(isAbortError\(error\)\) return;/g) ?? []).length, 2);
  // A fresh login attempt resets the post-dispatch marker so stale boundary
  // state can never masquerade as a post-dispatch 401.
  assert.match(source, /sessionAcceptedRef\.current = false;/);
  // Legacy after an authenticated dispatch navigates safely instead of
  // staying stuck in the authenticating phase.
  assert.match(source, /phase === "restoring" \|\| phase === "anonymous" \|\| phase === "expired" \|\| phase === "authenticating"/);
});

test("Dashboard login CSS is a self-contained module with no global leakage", async () => {
  const css = await readFile(CSS_URL, "utf8");
  assert.match(css, /\.shell \{/);
  assert.match(css, /\.skipLink/);
  assert.match(css, /\.main \{/);
  assert.match(css, /\.loginCard/);
  assert.match(css, /\.stateCard/);
  assert.match(css, /\.submit/);
  assert.match(css, /\.retry/);
  // Focus visibility and forced-colors support.
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media \(forced-colors: active\)/);
  // No top-level global element selectors (module-scoped descendants like
  // `.field input` are fine; bare html/body/main/form/input/button are not).
  assert.doesNotMatch(css, /(^|,\s*)(?:html|body|main|form|input|button)\b/);
});

test("Dashboard login shell renders no storefront chrome and no full dashboard nav", async () => {
  const source = await readFile(LOGIN_SOURCE_URL, "utf8");
  // The login owns its chrome: skip link + main landmark only.
  assert.match(source, /<a className=\{styles\.skipLink\} href="#main-content">/);
  assert.match(source, /id="main-content" tabIndex=\{-1\}/);
  assert.doesNotMatch(source, /SiteHeader|SiteFooter|CartAddedDrawer|CustomerSupportWidget|LocationDetector|CookieBar|CookiePreferenceDrawer/);
  // No full dashboard navigation (groups/links from the module registry).
  assert.doesNotMatch(source, /navVisibleModule|DASHBOARD_FOUNDATION_MODULE_STATE|Navigation\b/);
  // Anonymous/restoring never mount business data.
  assert.match(source, /phase === "restoring"/);
  assert.match(source, /phase === "forbidden"/);
  assert.match(source, /phase === "unavailable"/);
  assert.match(source, /phase === "invalid-response"/);
  assert.match(source, /phase === "authenticated"/);
});

test("Dashboard login reads returnTo Suspense-safe and adjudicates before navigation", async () => {
  const source = await readFile(LOGIN_SOURCE_URL, "utf8");
  // The returnTo query is read inside the form component that the page
  // renders behind a Suspense boundary — useSearchParams never suspends the
  // surrounding shell and the page still renders a restoring fallback.
  const formStart = source.indexOf("function DashboardLoginForm");
  const pageStart = source.indexOf("export function DashboardLoginPage");
  const formBlock = source.slice(formStart, pageStart);
  assert.match(formBlock, /useSearchParams\(\)/);
  assert.match(formBlock, /usePathname\(\)/);
  assert.match(formBlock, /const modules = foundation\?\.foundation\?\.modules;/);
  assert.match(source, /<Suspense fallback=\{<div aria-busy="true"/);
  assert.match(source, /<DashboardLoginForm locale=\{locale\} notice=\{notice\} \/>/);
  // The live Foundation projection is preferred over the shared mechanical
  // registry for the Authority layer; the registry fallback lives in the
  // library helper, never duplicated here.
  assert.match(formBlock, /foundation\?\.foundation\?\.modules/);
  // The login-page branch is detected on the trailingSlash-normalized
  // pathname so the explicit returnTo query survives Next redirects.
  assert.match(formBlock, /normalizedPathname === dashboardLoginHref\(locale\)/);
  // Post-login navigation goes through the adjudicated target (the ready
  // shell then adjudicates coming-soon / available-deny itself), and never
  // through an unvalidated window.location.
  assert.match(source, /if \(phase === "authenticated"\) router\.replace\(returnTo\)/);
  assert.doesNotMatch(source, /window\.location/);
});
