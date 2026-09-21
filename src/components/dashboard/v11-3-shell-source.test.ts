import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (rel: string) => readFile(new URL(`./${rel}`, import.meta.url), "utf8");

test("user menu follows standard button + menu semantics", async () => {
  const source = await read("ShellUserMenu.tsx");
  // trigger: haspopup/expanded/controls
  assert.match(source, /aria-haspopup="menu"/);
  assert.match(source, /aria-expanded=\{open\}/);
  assert.match(source, /aria-controls="shell-user-menu"/);
  // menu: role=menu + a single logout menuitem
  assert.match(source, /role="menu" aria-label="用户菜单"/);
  assert.match(source, /role="menuitem"/);
  assert.match(source, /aria-label="用户菜单"/);
  // keyboard closure paths: Escape, outside pointerdown, focusout (Tab exit)
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /"pointerdown"/);
  assert.match(source, /"focusout"/);
  // logout must never attempt to refocus the (about-to-unmount) trigger
  assert.doesNotMatch(source, /handleLogoutClick[\s\S]{0,200}triggerRef\.current\?\.focus\(\)/);
});

test("mobile drawer declares full modal semantics and reuses the shared nav", async () => {
  const source = await read("MobileNavigationDrawer.tsx");
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-labelledby="dashboard-f0-drawer-title"/);
  assert.match(source, /id="dashboard-f0-mobile-navigation"/);
  assert.match(source, /aria-label="关闭导航"/);
  // the drawer feeds the same ShellNavigation module model as the desktop sidebar
  assert.match(source, /<ShellNavigation/);
  assert.match(source, /onNavigate=\{\(href\) => \{ onClose\("navigation"\); onNav\?\.\(href\); \}\}/);
});

test("drawer focus behavior lives in the shell (single focus manager)", async () => {
  const shell = await read("DashboardF0Shell.tsx");
  // the V11-2 useModalFocus + reason-based focus return is preserved
  assert.match(shell, /useModalFocus\(\{ active: drawerOpen/);
  assert.match(shell, /"breakpoint"/);
  assert.match(shell, /"navigation"/);
  // body scroll lock + breakpoint close remain in the shell
  assert.match(shell, /document\.body\.style\.overflow = "hidden"/);
  assert.match(shell, /matchMedia\("\(min-width: 761px\)"\)/);
});

test("shell re-establishes main-content focus after a route mount", async () => {
  const shell = await read("DashboardF0Shell.tsx");
  // Dashboard routes render the shell per page, so client navigation between
  // different page modules unmounts the old shell and mounts a new one. The
  // mount effect must re-focus #main-content on the next frame, otherwise the
  // drawer-navigation focus contract dies with the old tree (S15 regression).
  assert.match(shell, /window\.requestAnimationFrame\(\(\) => \{\s*const main = mainRef\.current;/);
  assert.match(shell, /if \(main && document\.activeElement !== main\) main\.focus\(\);/);
});

test("shell touch targets are >= 44 CSS px (2.75rem)", async () => {
  const css = await read("DashboardF0Shell.module.css");
  assert.match(css, /\.menuButton[^{]*\{[^}]*min-height: 2\.75rem/);
  assert.match(css, /\.userMenuTrigger[^{]*\{[^}]*min-height: 2\.75rem/);
  assert.match(css, /\.drawerClose[^{]*\{[^}]*min-height: 2\.75rem/);
  assert.match(css, /\.drawerHeader button[^{]*\{[^}]*min-height: 2\.75rem/);
});

test("status row is a compact toolbar, not a nested card stack", async () => {
  const css = await read("DashboardF0Shell.module.css");
  assert.match(css, /\.statusRow \{ display: flex; flex-wrap: wrap/);
  assert.doesNotMatch(css, /\.statusRow (?:div|section) \{[^}]*border-radius/);
});

test("anonymous shell stays the V11-2 login with no navigation", async () => {
  const shell = await read("DashboardF0Shell.tsx");
  const anonymousBranch = shell.slice(shell.indexOf('if (foundationState.status === "anonymous")'));
  assert.match(anonymousBranch, /<DashboardLoginPage locale=\{locale\} notice=\{expiredNotice \? "expired" : null\} \/>/);
  assert.doesNotMatch(anonymousBranch.slice(0, 400), /管理后台主要导航/);
});

test("skip link and single H1 structure are preserved", async () => {
  const shell = await read("DashboardF0Shell.tsx");
  assert.match(shell, /href="#main-content">跳至主要内容<\/a>/);
  const readyBranch = shell.slice(shell.indexOf("const foundation = foundationState.foundation;"));
  assert.equal((readyBranch.match(/<h1>/g) ?? []).length, 1);
});

test("disabled global entries render as inert text, not focusable controls", async () => {
  const nav = await read("ShellNavigation.tsx");
  assert.match(nav, /<span className=\{styles\.comingSoonFeature\}[^>]*>/);
  assert.doesNotMatch(nav, /<button[^>]*disabled/);
});
