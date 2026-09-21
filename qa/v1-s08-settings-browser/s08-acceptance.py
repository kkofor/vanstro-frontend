#!/usr/bin/env python3
"""S08 API/Service Account Settings browser acceptance: real Chrome/Playwright
against the controlled fixture. Records raw/expected/unexpected console and
request evidence plus the fixture's zero-side-effect counters (businessWrites,
providerCalls, jobs). Covers four-family editing, policy draft lifecycle,
validation failure (unknown role key), safe diff, publish with zero side
effects, exact-generation readiness (5 ready + 1 future), read-only impact
preview, token create one-time reveal + second read no plaintext, rotate
overlap + idempotent replay no plaintext, revoke, invocation safe view, EN/fr
routes, a11y landmarks and 0 unexpected console/requests."""
import hashlib, json, os, re, sys, time, urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).parent
OUT = Path(os.environ["S08_BROWSER_OUT"])
WEB = os.environ.get("S08_WEB", "http://127.0.0.1:4574")
API = os.environ.get("S08_API", "http://127.0.0.1:4575")
OUT.mkdir(parents=True, exist_ok=True)
definition = json.loads((HERE / "s08-definition.json").read_text())
cases = {x["id"]: {**x, "status": "not-executed", "observations": []} for x in definition["cases"]}
network = []
console = []

def result(i, ok, *obs):
  cases[i].update(status="pass" if ok else "fail", observations=list(obs))
  print(f"STEP {i} {'PASS' if ok else 'FAIL'}", file=sys.stderr, flush=True)
def state():
  return json.loads(urllib.request.urlopen(API + "/control/state", timeout=5).read())["state"]
def control(**kw):
  urllib.request.urlopen(urllib.request.Request(API + "/control", data=json.dumps(kw).encode(), headers={"Content-Type": "application/json"}, method="POST"), timeout=5).read()
def api_json(path):
  return json.loads(urllib.request.urlopen(API + path, timeout=5).read())["data"]
def api_post(path, body):
  req = urllib.request.Request(API + path, data=json.dumps(body).encode(), headers={"Content-Type": "application/json"}, method="POST")
  return json.loads(urllib.request.urlopen(req, timeout=5).read())["data"]
def js_click(p, label, timeout=15000):
  def _alarm(_s, _f):
    print(f"ALARM killed js_click {label}", file=sys.stderr, flush=True)
    print("ALARM console:", json.dumps(console[-8:], ensure_ascii=False)[:800], file=sys.stderr, flush=True)
    print("ALARM network:", json.dumps(network[-6:])[:400], file=sys.stderr, flush=True)
    _t.sleep(2); os._exit(3)
  _sig.signal(_sig.SIGALRM, _alarm)
  _sig.alarm(25)
  try:
    end = time.monotonic() + timeout
    while time.monotonic() < end:
      ok = p.evaluate("""(label) => {
        const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes(label) && !x.disabled);
        if (!b) return false;
        const f = b.closest('form');
        if (f && b.type === 'submit') f.addEventListener('submit', (e) => e.preventDefault(), { once: true });
        b.click();
        return true;
      }""", label)
      if ok: return
      time.sleep(0.25)
  finally:
    _sig.alarm(0)
  btns = p.evaluate("""() => [...document.querySelectorAll('button')].map(b => ({text: b.textContent.trim().slice(0,40), disabled: b.disabled}))""")
  print("DIAG buttons:", json.dumps(btns, ensure_ascii=False)[:800], file=sys.stderr)
  raise TimeoutError(f"button not actionable: {label}")

import signal as _sig, time as _t


with sync_playwright() as pw:
  b = pw.chromium.launch(headless=True, executable_path="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
                         args=["--disable-background-networking", "--no-first-run", "--disable-back-forward-cache"])
  p = b.new_page(viewport={"width": 1440, "height": 1000})
  p.on("request", lambda r: network.append(r.url))
  p.on("framenavigated", lambda f: network.append(f.url) if f == p.main_frame else None)
  p.on("console", lambda m: console.append({"type": m.type, "text": m.text}))
  p.on("pageerror", lambda e: console.append({"type": "error", "text": str(e)}))
  control(profile="writer")

  # S08-01: four-family panel renders with compiled defaults.
  p.goto(WEB + "/dashboard/settings/api-service-accounts"); p.wait_for_timeout(2500)
  text = p.locator("body").inner_text()
  if "令牌生命周期策略" not in text:
      print("DIAG body:", text[:800].replace("\n", " | "), file=sys.stderr)
      print("DIAG url:", p.url, file=sys.stderr)
      raise SystemExit(2)
  result("S08-01", all(x in text for x in ["令牌生命周期策略", "机器范围策略", "速率限制策略", "审计与调用策略", "编译默认值", "settings.api-service-account", "默认 TTL（天）", "每分钟请求数"]), text[:400])

  # S08-02: empty validation + empty history + accounts/invocations render.
  result("S08-02", "尚未验证当前草稿" in text and "尚无发布历史" in text and "商品目录读取服务" in text and "调用安全读模型" in text, "empty states and safe views")

  # S08-03: consumer matrix shows 5 implemented_ready + 1 future obligation.
  result("S08-03", "消费者就绪矩阵" in text and "已实现且就绪" in text and "未来义务" in text and "令牌生命周期" in text and "ERP 商品 API 机器身份" in text, "consumer matrix at compiled defaults")

  # S08-04: create draft -> save flow with a policy change.
  p.locator('input[type="number"]').first.fill("120")
  p.locator("textarea").first.fill("S08 browser 草稿创建原因文本")
  js_click(p, "创建草稿"); p.wait_for_timeout(800)
  drafts = api_json("/dashboard/settings/s08-drafts")
  result("S08-04", len(drafts) == 1 and drafts[0]["status"] == "draft" and drafts[0]["value"]["tokenLifecyclePolicy"]["defaultTtlDays"] == 120, "draft created defaultTtlDays=120")

  # S08-05: unknown role key -> server-side validation blocker, draft invalid.
  p.evaluate("""() => {
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
    const inp = [...document.querySelectorAll('input')].find(i => i.type === 'text');
    set.call(inp, 'ROGUE_ROLE');
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  }""")
  js_click(p, "保存草稿"); p.wait_for_timeout(800)
  js_click(p, "验证"); p.wait_for_timeout(800)
  text = p.locator("body").inner_text()
  drafts_after = api_json("/dashboard/settings/s08-drafts")
  result("S08-05", "验证未通过" in text and "S08_ROLE_UNKNOWN" in text and drafts_after[0]["status"] == "invalid", "unknown role key rejected by server validation")

  # S08-06: clear the rogue role, re-save and validate -> validated.
  p.evaluate("""() => {
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
    const inp = [...document.querySelectorAll('input')].find(i => i.type === 'text');
    set.call(inp, '');
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  }""")
  js_click(p, "保存草稿"); p.wait_for_timeout(800)
  js_click(p, "验证"); p.wait_for_timeout(800)
  text = p.locator("body").inner_text()
  result("S08-06", "验证通过，可检查差异后发布" in text, "validated after fix")

  # S08-07: safe diff shows the public policy change.
  text = p.locator("body").inner_text()
  result("S08-07", "公开字段安全差异" in text and "tokenLifecyclePolicy" in text, "safe diff visible")

  # S08-08: publish; fixture zero side effects.
  js_click(p, "发布"); p.wait_for_timeout(800)
  st = state()
  history = api_json("/dashboard/settings/s08-history")
  result("S08-08", st["generation"] >= 1 and len(history) >= 1 and st["businessWrites"] == st["providerCalls"] == st["jobs"] == 0, json.dumps(st))

  # S08-09: exact-generation readiness with 5 ready + 1 future obligation.
  gen = st["generation"]
  ready = api_json(f"/dashboard/settings/s08-readiness?consumerGeneration={gen}")
  states = [c["state"] for c in ready["consumers"]]
  ids = [c["id"] for c in ready["consumers"]]
  ready_consumers = [c for c in ready["consumers"] if c["state"] == "implemented_ready"]
  future = [c for c in ready["consumers"] if c["state"] == "future_obligation"]
  result("S08-09", ready["state"] == "degraded" and states.count("implemented_ready") == 5 and states.count("future_obligation") == 1 and "erp-product-api-machine" in ids and all(c["generation"] == gen for c in ready_consumers) and len(future) == 1 and future[0]["id"] == "erp-product-api-machine", f"readiness gen={gen} states={states}")

  # S08-10: read-only impact preview with zero side effects and no token material.
  before = state()
  js_click(p, "只读影响预览"); p.wait_for_timeout(800)
  after = state()
  text = p.locator("body").inner_text()
  preview = api_post("/dashboard/settings/s08-impact-preview", {"candidate": api_json("/dashboard/settings/s08-overview")["effective"]})
  preview_raw = json.dumps(preview)
  result("S08-10", "候选可接受" in text and "聚合规模" in text and after["businessWrites"] == before["businessWrites"] and after["providerCalls"] == before["providerCalls"] and after["jobs"] == before["jobs"] and "plaintext" not in preview_raw and "tokenHash" not in preview_raw, "preview aggregate-only, zero side effects, no token material")

  # S08-11: rollback draft from history.
  js_click(p, "创建回滚草稿"); p.wait_for_timeout(600)
  drafts = api_json("/dashboard/settings/s08-drafts")
  result("S08-11", any(d["status"] == "rollback_draft" for d in drafts), "rollback draft created")

  # S08-12: token create one-time reveal + second read no plaintext.
  accounts = api_json("/dashboard/mcp/service-accounts")
  account_id = accounts[0]["id"]
  p.evaluate("""() => {
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
    const inp = [...document.querySelectorAll('input')].find(i => i.placeholder && i.placeholder.includes('目录同步'));
    set.call(inp, '目录同步令牌');
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  }""")
  js_click(p, "创建令牌"); p.wait_for_timeout(800)
  dialog = p.get_by_role("dialog")
  revealed = ""
  if dialog.count():
    revealed = dialog.locator("code").first.inner_text().strip()
  js_click(p, "我已保存，关闭"); p.wait_for_timeout(400)
  text = p.locator("body").inner_text()
  tokens = api_json(f"/dashboard/mcp/service-accounts/{account_id}/tokens")
  second_read = api_json(f"/dashboard/mcp/service-accounts/{account_id}/tokens")
  result("S08-12", revealed.startswith("s08_") and len(revealed) > 20 and revealed not in text and all("plaintext" not in t for t in tokens) and all("plaintext" not in t for t in second_read) and any(t["status"] == "active" for t in tokens), "plaintext revealed exactly once; absent after dismissal and on second read")

  # S08-13: rotate overlap semantics + idempotent replay no plaintext.
  token_id = next(t["id"] for t in tokens if t["status"] == "active")
  js_click(p, "轮换"); p.wait_for_timeout(800)
  dialog = p.get_by_role("dialog")
  rotate_ok = False
  if dialog.count():
    dtext = dialog.inner_text()
    rotate_ok = "重叠截止" in dtext and "前序令牌到期时间已收窄" in dtext and dialog.locator("code").first.inner_text().startswith("s08_")
    js_click(p, "我已保存，关闭"); p.wait_for_timeout(400)
  tokens_after = api_json(f"/dashboard/mcp/service-accounts/{account_id}/tokens")
  rotated = next((t for t in tokens_after if t["id"] == token_id), None)
  replay_token_id = next(t["id"] for t in tokens_after if t["status"] == "active")
  replay1 = api_post(f"/dashboard/mcp/service-accounts/{account_id}/tokens/{replay_token_id}/rotate", {"idempotencyKey": "s08-rotate-replay-0001"})
  replay2 = api_post(f"/dashboard/mcp/service-accounts/{account_id}/tokens/{replay_token_id}/rotate", {"idempotencyKey": "s08-rotate-replay-0001"})
  tokens_final = api_json(f"/dashboard/mcp/service-accounts/{account_id}/tokens")
  active_count = sum(1 for t in tokens_final if t["status"] == "active")
  result("S08-13", rotate_ok and rotated is not None and rotated["status"] == "rotated" and rotated["expiresAt"] is not None and replay1["plaintextAvailable"] is True and replay2["plaintextAvailable"] is False and replay1["id"] == replay2["id"] and replay2["plaintext"] is None and active_count == 1, f"rotate overlap + replay (active={active_count})")

  # S08-14: revoke via panel confirmation.
  js_click(p, "撤销"); p.wait_for_timeout(400)
  dialog = p.get_by_role("dialog")
  if dialog.count():
    dialog.locator("textarea").last.fill("S08 browser 撤销令牌原因")
    js_click(p, "确认撤销"); p.wait_for_timeout(800)
  tokens = api_json(f"/dashboard/mcp/service-accounts/{account_id}/tokens")
  revoked = [t for t in tokens if t["status"] == "revoked"]
  result("S08-14", len(revoked) >= 1 and all(t["revokedAt"] is not None for t in revoked), "token revoked")

  # S08-15: invocation safe view never returns input/output/error.
  invocations = api_json("/dashboard/mcp/invocations")
  safe_keys = {"id", "serviceAccount", "toolKey", "status", "createdAt", "errorClass"}
  inv_ok = all(set(x.keys()) == safe_keys and set(x["serviceAccount"].keys()) == {"id", "key", "name"} for x in invocations)
  text = p.locator("body").inner_text()
  result("S08-15", inv_ok and "DEPENDENCY_UNAVAILABLE" in text and "调用安全读模型" in text, "safe invocation fields only")

  # S08-16: FR static route renders the same panel.
  p.goto(WEB + "/fr/dashboard/settings/api-service-accounts"); p.wait_for_timeout(1500)
  text = p.locator("body").inner_text()
  result("S08-16", "API 与服务账号设置" in text and "令牌生命周期策略" in text, p.url)

  # S08-17: named region + tables (a11y landmarks).
  result("S08-17", p.locator('section[aria-label="API 与服务账号设置"]').count() == 1 and p.get_by_role("table").count() >= 1, "named region and tables")

  # S08-18: no unexpected console errors and no unexpected requests.
  unexpected_console = [x for x in console if x["type"] == "error"]
  unexpected_network = [u for u in network if not (u.startswith(WEB) or u.startswith(API) or u.startswith("data:") or u.startswith("blob:"))]
  result("S08-18", not unexpected_console, *[x["text"] for x in unexpected_console])
  result("S08-19", not unexpected_network, *unexpected_network)

  b.close()

counts = {x: sum(v["status"] == x for v in cases.values()) for x in ["pass", "fail", "not-executed"]}
report = {
  "suiteId": definition["suiteId"], "testedCommit": os.environ["S08_TESTED_COMMIT"], "testedTree": os.environ["S08_TESTED_TREE"],
  "cases": list(cases.values()), "counts": counts,
  "unexpectedConsole": [x for x in console if x["type"] == "error"],
  "unexpectedRequests": [u for u in network if not (u.startswith(WEB) or u.startswith(API) or u.startswith("data:") or u.startswith("blob:"))],
  "fixtureSafety": {k: state()[k] for k in ("businessWrites", "providerCalls", "jobs")},
  "sha256": {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in HERE.iterdir() if p.is_file()}
}
(OUT / "acceptance-results.json").write_text(json.dumps(report, ensure_ascii=False, indent=2))
print(json.dumps(counts))
sys.exit(1 if counts["fail"] or counts["not-executed"] else 0)
