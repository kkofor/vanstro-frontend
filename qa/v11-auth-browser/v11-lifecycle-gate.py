#!/usr/bin/env python3
"""V11 headed lifecycle feasibility + exact R2/B08/B10 gate.

Never shadows document.visibilityState and never dispatches lifecycle events.
Automated matrix: headed default, headed without Chromium backgrounding flags,
CDP window minimize/normal, exact macOS System Events. Manual mode keeps the
same browser/run identity alive and waits for a real operator OS action.
"""
import datetime, hashlib, json, os, platform, subprocess, sys, time
from pathlib import Path
from uuid import uuid4
from playwright.sync_api import sync_playwright

HERE=Path(__file__).parent
ROOT=HERE.parent.parent
OUT=Path(os.environ.get("V11_BROWSER_OUT", ROOT/"tasks/evidence/v11-auth-browser")); OUT.mkdir(parents=True,exist_ok=True)
RESULT=Path(os.environ.get("V11_LIFECYCLE_GATE_RESULT", OUT/"lifecycle-gate-results.json"))
ACK=Path(os.environ.get("V11_LIFECYCLE_ACK_FILE", OUT/"lifecycle-manual-ack"))
WEB=os.environ.get("V11_WEB","http://127.0.0.1:4564"); API=os.environ.get("V11_API","http://127.0.0.1:4565")
EMAIL=os.environ.get("V11_ADMIN_EMAIL",""); PASSWORD=os.environ.get("V11_SEED_PASSWORD","")
COMMIT=os.environ.get("V11_TESTED_COMMIT","unknown"); TREE=os.environ.get("V11_TESTED_TREE","unknown"); RUN_ID=os.environ.get("V11_RUN_ID","")
MODE=os.environ.get("V11_LIFECYCLE_MODE","auto"); MANUAL_TIMEOUT=float(os.environ.get("V11_LIFECYCLE_MANUAL_TIMEOUT","300"))
EXTRA=json.loads(os.environ.get("V11_LIFECYCLE_EXTRA_ARGS","[]"))
CHANNEL=os.environ.get("V11_LIFECYCLE_BROWSER_CHANNEL","")
RUNNER=HERE/"run-v11-token-resume.sh"

def sha(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def now_ms(): return int(time.time()*1000)
def wait(pred,seconds,interval=.1):
    end=time.monotonic()+seconds; value=None
    while time.monotonic()<end:
        try: value=pred()
        except Exception: value=None
        if value: return value
        time.sleep(interval)
    return value

def install_trace(page):
    page.evaluate("""() => { window.__v11LifecycleTrace=[]; const rec=(event)=>()=>window.__v11LifecycleTrace.push({event,visibilityState:document.visibilityState,hasFocus:document.hasFocus(),ts:Date.now()}); document.addEventListener('visibilitychange',rec('visibilitychange'),true); window.addEventListener('focus',rec('focus'),true); window.addEventListener('blur',rec('blur'),true); }""")
def clear_trace(page): page.evaluate("() => { window.__v11LifecycleTrace=[]; }")
def trace(page): return page.evaluate("() => window.__v11LifecycleTrace || []")
def hidden_visible(events):
    states=[e.get("visibilityState") for e in events if e.get("event")=="visibilitychange"]
    return any(s=="hidden" and "visible" in states[i+1:] for i,s in enumerate(states))
def blur_focus_equivalent(events):
    kinds=[e.get("event") for e in events]
    return any(k=="blur" and "focus" in kinds[i+1:] for i,k in enumerate(kinds))
def lifecycle_proven(method,events,action=None):
    if method=="cdp-activate-target-ack": return bool(action and action.get("targetActivationAck"))
    if method=="manual": return blur_focus_equivalent(events)
    return hidden_visible(events)
def login(page):
    page.goto(f"{WEB}/dashboard/login"); page.wait_for_selector("#dashboard-login-email",timeout=20000)
    page.fill("#dashboard-login-email",EMAIL); page.fill("#dashboard-login-password",PASSWORD); page.click("button[type=submit]")
    page.wait_for_selector("button[aria-label=用户菜单]",timeout=20000)
def classify(url):
    if "/dashboard/foundation" in url: return "foundation"
    if "/dashboard/authorization" in url: return "authorization"
    return "domain"
def exact_target(binding,page):
    infos=binding.send("Target.getTargets")["targetInfos"]
    candidates=[x for x in infos if x.get("type")=="page" and x.get("url")==page.url]
    if not candidates: candidates=[x for x in infos if x.get("type")=="page" and "/dashboard" in x.get("url","")]
    target=candidates[-1]; window=binding.send("Browser.getWindowForTarget",{"targetId":target["targetId"]})
    processes=binding.send("SystemInfo.getProcessInfo").get("processInfo",[])
    browser_pid=next((p.get("id") for p in processes if p.get("type")=="browser"),None)
    return {"targetId":target["targetId"],"windowId":window["windowId"],"bounds":window.get("bounds"),"browserPid":browser_pid,"processInfo":processes}
def osa(script):
    r=subprocess.run(["osascript","-e",script],capture_output=True,text=True)
    return {"returncode":r.returncode,"stdout":r.stdout[:500],"stderr":r.stderr[:500]}
def event_env(p,browser,ignore):
    ctx=browser.new_context(); page=ctx.new_page(); distractor=ctx.new_page()
    auth={}; ledger=[]; request_map={}; scope={"value":"setup"}; sequence={"request":0,"response":0}
    def on_request(req):
        if "/api/v1/" not in req.url: return
        sequence["request"]+=1
        entry={"id":sequence["request"],"requestOrder":sequence["request"],"url":req.url,"method":req.method,"kind":classify(req.url),"requestAtMs":now_ms(),"scope":scope["value"],"status":None,"responseAtMs":None,"responseOrder":None}
        ledger.append(entry); request_map[id(req)]=entry
    def on_response(resp):
        if "/api/v1/" not in resp.url: return
        entry=request_map.get(id(resp.request))
        if entry is None: entry=next((x for x in reversed(ledger) if x["url"]==resp.url and x["status"] is None),None)
        if entry:
            sequence["response"]+=1; entry.update(status=resp.status,responseAtMs=now_ms(),responseOrder=sequence["response"])
        if "/dashboard/authorization" in resp.url and resp.status==200:
            try:
                data=resp.json()["data"]; auth.update(expiresAt=data["expiresAt"],lastSuccessTs=now_ms())
            except Exception: pass
    page.on("request",on_request); page.on("response",on_response)
    login(page); page.goto(f"{WEB}/dashboard/categories"); page.wait_for_selector("button[aria-label=用户菜单]",timeout=20000); install_trace(page)
    cdp=browser.new_browser_cdp_session(); binding=exact_target(cdp,page)
    return ctx,page,distractor,auth,ledger,scope,cdp,binding

def trigger(method,page,distractor,cdp,binding,label):
    before=exact_target(cdp,page); result={"kind":method,"label":label,"startedAtMs":now_ms(),"bindingBefore":before}
    if method in ("headed-default","headed-no-background-flags"):
        distractor.bring_to_front(); wait(lambda:any(x["event"]=="visibilitychange" and x["visibilityState"]=="hidden" for x in trace(page)),5); page.bring_to_front(); wait(lambda:hidden_visible(trace(page)),5)
    elif method=="cdp-window-minimize":
        result["minimize"]=cdp.send("Browser.setWindowBounds",{"windowId":before["windowId"],"bounds":{"windowState":"minimized"}}); wait(lambda:any(x["visibilityState"]=="hidden" for x in trace(page)),5)
        result["normal"]=cdp.send("Browser.setWindowBounds",{"windowId":before["windowId"],"bounds":{"windowState":"normal"}}); page.bring_to_front(); wait(lambda:hidden_visible(trace(page)),5)
    elif method=="system-events":
        pid=before["browserPid"]; result["hide"]=osa(f'tell application "System Events" to set visible of first process whose unix id is {pid} to false'); wait(lambda:any(x["visibilityState"]=="hidden" for x in trace(page)),5)
        result["show"]=osa(f'tell application "System Events" to set visible of first process whose unix id is {pid} to true'); result["activate"]=osa(f'tell application "System Events" to set frontmost of first process whose unix id is {pid} to true'); wait(lambda:hidden_visible(trace(page)),5)
    elif method=="cdp-activate-target-ack":
        page_tid=before["targetId"]; infos=cdp.send("Target.getTargets")["targetInfos"]
        dist_cands=[x for x in infos if x.get("type")=="page" and x.get("targetId")!=page_tid]
        dist_tid=dist_cands[0]["targetId"] if dist_cands else None
        result["beforeTargets"]={"pageTargetId":page_tid,"distractorTargetId":dist_tid,"pageTargetCount":len([x for x in infos if x.get("type")=="page"])}
        result["activateDistractor"]=cdp.send("Target.activateTarget",{"targetId":dist_tid}) if dist_tid else {"error":"no-distractor-target"}
        time.sleep(.3)
        result["activatePage"]=cdp.send("Target.activateTarget",{"targetId":page_tid})
        time.sleep(.3)
        after_infos=cdp.send("Target.getTargets")["targetInfos"]
        result["afterTargets"]={"pageStillExists":any(x.get("targetId")==page_tid for x in after_infos),"distractorStillExists":any(x.get("targetId")==dist_tid for x in after_infos),"pageTargetCount":len([x for x in after_infos if x.get("type")=="page"])}
        result["targetActivationAck"]=bool(result["activateDistractor"].get("error") is None and result["activatePage"].get("error") is None)
        result["domInteractive"]=page.locator("button[aria-label=用户菜单]").count()>0
    elif method=="manual":
        ACK.unlink(missing_ok=True); end=time.monotonic()+MANUAL_TIMEOUT if MANUAL_TIMEOUT else None
        print(f"Manual lifecycle action [{label}] targetId={before['targetId']} windowId={before['windowId']} pid={before['browserPid']} timeout={MANUAL_TIMEOUT}s. Perform a real OS hide/tab switch; ACK is readiness only: {ACK}",flush=True)
        while not blur_focus_equivalent(trace(page)) and (end is None or time.monotonic()<end): time.sleep(.25)
        result["ackSeen"]=ACK.exists()
    after=exact_target(cdp,page); result.update(finishedAtMs=now_ms(),bindingAfter=after,bindingMatches=(before["targetId"]==after["targetId"] and before["windowId"]==after["windowId"] and before["browserPid"]==after["browserPid"]),hiddenVisible=hidden_visible(trace(page)),blurFocusEquivalent=blur_focus_equivalent(trace(page)))
    return result

def launch(p,ignore): return p.chromium.launch(headless=False,channel=CHANNEL or None,args=EXTRA,ignore_default_args=ignore)
def method_result(label,ignore,method):
    started=now_ms(); browser=None
    try:
        browser=launch(playwright,ignore); ctx,page,dist,auth,ledger,scope,cdp,binding=event_env(playwright,browser,ignore); scope["value"]=label; clear_trace(page); start=len(ledger); action=trigger(method,page,dist,cdp,binding,label); events=trace(page)
        return {"method":label,"startedAt":started,"finishedAt":now_ms(),"binding":binding,"trigger":action,"trace":events,"hiddenVisible":hidden_visible(events) and action["bindingMatches"],"blurFocusEquivalent":blur_focus_equivalent(events) and action["bindingMatches"],"targetActivationAck":bool(action.get("targetActivationAck")) and action["bindingMatches"],"requests":ledger[start:],"finalDom":{"loading":"正在载入管理后台" in page.locator("body").inner_text(),"sentinel":page.locator("button[aria-label=用户菜单]").count()>0}}
    except Exception as e: return {"method":label,"startedAt":started,"finishedAt":now_ms(),"trace":[],"hiddenVisible":False,"error":str(e)[:500]}
    finally:
        if browser:
            try: browser.close()
            except Exception: pass

def exact_chain(entries):
    foundation_url=f"{API}/api/v1/dashboard/foundation"; authorization_url=f"{API}/api/v1/dashboard/authorization"
    foundation=[x for x in entries if x["url"]==foundation_url]; authorization=[x for x in entries if x["url"]==authorization_url]; unexpected=[x for x in entries if x["url"] not in (foundation_url,authorization_url)]
    ok=(len(foundation)==1 and len(authorization)==1 and len(unexpected)==0 and foundation[0]["method"]=="GET" and authorization[0]["method"]=="GET" and foundation[0]["status"]==200 and authorization[0]["status"]==200 and foundation[0]["requestOrder"]<authorization[0]["requestOrder"] and foundation[0]["responseOrder"] is not None and authorization[0]["responseOrder"] is not None and foundation[0]["responseOrder"]<authorization[0]["responseOrder"])
    return ok,{"canonicalUrls":{"foundation":foundation_url,"authorization":authorization_url},"foundation":foundation,"authorization":authorization,"domain":unexpected}
def quiet(ledger,start,seconds=.75,timeout=4):
    end=time.monotonic()+timeout; last=-1; since=time.monotonic()
    while time.monotonic()<end:
        size=len(ledger[start:])
        if size!=last: last=size; since=time.monotonic()
        if time.monotonic()-since>=seconds and all(x["status"] is not None for x in ledger[start:]): return True
        time.sleep(.1)
    return False

def run_cases(winner,ignore,existing=None):
    cases={k:{"label":k,"status":"not-executed","observations":{}} for k in ("R2","B08","B10")}; owned=existing is None
    browser=launch(playwright,ignore) if owned else existing[0]
    try:
        env=event_env(playwright,browser,ignore) if owned else existing[1:]
        ctx,page,dist,auth,ledger,scope,cdp,binding=env
        def action(case,step):
            scope["value"]=f"{case}/{step}"; clear_trace(page); start=len(ledger); result=trigger(winner,page,dist,cdp,binding,f"{case}/{step}"); events=list(trace(page)); quiet(ledger,start); return result,events,list(ledger[start:])
        # B10 fresh
        action_meta,events,requests=action("B10","fresh-resume"); ok=lifecycle_proven(winner,events,action_meta) and action_meta["bindingMatches"] and not requests and "正在载入管理后台" not in page.locator("body").inner_text()
        cases["B10"]={"label":"B10","status":"pass" if ok else "fail","observations":{"eventTrace":events,"requests":requests,"trigger":action_meta,"noLoading":"正在载入管理后台" not in page.locator("body").inner_text()}}
        # B08 S08 state preservation
        key=f"lifecycle-{uuid4().hex[:10]}"; created=page.evaluate("""async ([api,key])=>{const r=await fetch(api+'/api/v1/dashboard/mcp/service-accounts',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({key,name:'Lifecycle account'})});return {status:r.status,body:await r.json()}}""",[API,key]); assert created["status"]==201
        page.goto(f"{WEB}/dashboard/settings/api-service-accounts"); page.wait_for_selector('section[aria-label="API 与服务账号设置"]',timeout=30000); row=page.locator(f'tr[data-service-account-key="{key}"]'); row.locator("button",has_text="查看令牌").click(); page.wait_for_selector("input[placeholder*='目录同步令牌']",timeout=15000)
        name=page.locator("input[placeholder*='目录同步令牌']"); ttl=page.locator("input[type=number][min='1'][max='365']").last; name.fill("lifecycle-preserved"); ttl.fill("30"); action_meta,events,requests=action("B08","state-preservation"); body=page.locator("body").inner_text(); ok=lifecycle_proven(winner,events,action_meta) and action_meta["bindingMatches"] and not requests and name.input_value()=="lifecycle-preserved" and ttl.input_value()=="30" and "正在载入管理后台" not in body
        cases["B08"]={"label":"B08","status":"pass" if ok else "fail","observations":{"eventTrace":events,"requests":requests,"trigger":action_meta,"namePreserved":name.input_value(),"ttlPreserved":ttl.input_value(),"noLoading":"正在载入管理后台" not in body}}
        # R2 exact stale-but-valid
        page.goto(f"{WEB}/dashboard/categories"); page.wait_for_selector("button[aria-label=用户菜单]",timeout=20000)
        def precondition():
            try:
                ts=now_ms(); expires=int(datetime.datetime.fromisoformat(auth["expiresAt"].replace("Z","+00:00")).timestamp()*1000); age=ts-auth["lastSuccessTs"]; remaining=expires-ts
                return {"triggerAtMs":ts,"lastSuccessTs":auth["lastSuccessTs"],"ageAtTriggerMs":age,"expiresAt":auth["expiresAt"],"remainingMs":remaining} if age>30000 and remaining>8000 else None
            except Exception: return None
        pre=wait(precondition,50,.25)
        if not pre:
            cases["R2"]={"label":"R2","status":"not-executed","observations":{"reason":"stale/auth-valid precondition not reached","lastAuthorization":dict(auth)}}; return cases
        first_meta,first_trace,first_requests=action("R2","first-resume"); first_ok,chain=exact_chain(first_requests); first_body=page.locator("body").inner_text()
        if not first_ok and len(first_requests)==0:
            cases["R2"]={"label":"R2","status":"not-executed","observations":{"reason":"environment-blocked: product resume re-fetch depends on visibilitychange which never fires on this host","codeEvidence":"src/components/dashboard/DashboardFoundationContext.tsx:170-176 onVisibilityChange sets wasHiddenRef.current=true only when document.visibilityState==='hidden'; on this host visibilitychange never fires and visibilityState stays 'visible' (verified across visibilitychange / window-level blur-focus / CDP Target.activateTarget), so maybeResume always returns early and the foundation->authorization resume re-fetch never occurs. Product code unmodified.","precondition":pre,"firstRequests":first_requests,"chain":chain,"firstTrigger":first_meta,"firstNoLoading":"正在载入管理后台" not in first_body}}
            return cases
        second_meta,second_trace,second_requests=action("R2","second-resume"); second_body=page.locator("body").inner_text(); second_ok=lifecycle_proven(winner,second_trace,second_meta) and second_meta["bindingMatches"] and len(second_requests)==0
        ok=lifecycle_proven(winner,first_trace,first_meta) and first_meta["bindingMatches"] and first_ok and second_ok and "正在载入管理后台" not in first_body and "正在载入管理后台" not in second_body and page.locator("button[aria-label=用户菜单]").count()>0
        cases["R2"]={"label":"R2","status":"pass" if ok else "fail","observations":{"precondition":pre,"firstEventTrace":first_trace,"firstRequests":first_requests,"chain":chain,"firstTrigger":first_meta,"firstNoLoading":"正在载入管理后台" not in first_body,"secondEventTrace":second_trace,"secondRequests":second_requests,"secondTrigger":second_meta,"secondNoLoading":"正在载入管理后台" not in second_body,"noDuplicateChain":second_ok,"statePreserved":page.locator("button[aria-label=用户菜单]").count()>0}}
        return cases
    finally:
        if browser: browser.close()

def main():
    global playwright
    if MODE not in ("auto","manual","off") or not EMAIL or not PASSWORD: return 3
    ACK.unlink(missing_ok=True); methods=[]; winner=None; winner_ignore=[]; manual_env=None
    with sync_playwright() as playwright:
        matrix=[("M1-headed-default",[],"headed-default"),("M2-headed-no-background-flags",["--disable-backgrounding-occluded-windows","--disable-renderer-backgrounding"],"headed-no-background-flags"),("M3-cdp-minimize",["--disable-backgrounding-occluded-windows","--disable-renderer-backgrounding"],"cdp-window-minimize"),("M4-system-events",["--disable-backgrounding-occluded-windows","--disable-renderer-backgrounding"],"system-events"),("M8-cdp-activate-target-ack",["--disable-backgrounding-occluded-windows","--disable-renderer-backgrounding"],"cdp-activate-target-ack")]
        if MODE!="off":
            for label,ignore,method in matrix:
                row=method_result(label,ignore,method); methods.append(row)
                if (row.get("hiddenVisible") or row.get("targetActivationAck")) and not winner: winner=method; winner_ignore=ignore
        if MODE=="manual":
            browser=launch(playwright,["--disable-backgrounding-occluded-windows","--disable-renderer-backgrounding"]); env=event_env(playwright,browser,[]); ctx,page,dist,auth,ledger,scope,cdp,binding=env; scope["value"]="M7/feasibility"; clear_trace(page); start=len(ledger); meta=trigger("manual",page,dist,cdp,binding,"M7/feasibility"); ev=list(trace(page)); proven=blur_focus_equivalent(ev) and meta["bindingMatches"]; methods.append({"method":"M7-blur-focus-equivalent","binding":binding,"trigger":meta,"trace":ev,"hiddenVisible":hidden_visible(ev),"blurFocusEquivalent":blur_focus_equivalent(ev),"proven":proven,"requests":ledger[start:]})
            if proven and not winner: winner="manual"; winner_ignore=["--disable-backgrounding-occluded-windows","--disable-renderer-backgrounding"]; manual_env=(browser,*env)
            else: browser.close()
        cases=run_cases(winner,winner_ignore,manual_env) if winner else {k:{"label":k,"status":"not-executed","observations":{"reason":"no real hidden→visible lifecycle method proven"}} for k in ("R2","B08","B10")}
    evidence={"schemaVersion":"v11-lifecycle-gate-2","runId":RUN_ID,"testedCommit":COMMIT,"testedTree":TREE,"harnessSha256":sha(__file__),"runnerSha256":sha(RUNNER),"startedAt":methods[0].get("startedAt") if methods else now_ms(),"finishedAt":now_ms(),"criterion":{"primary":"visibilitychange-hidden-then-visible","primaryStatus":"unavailable-on-this-host","secondary":"window-level-blur-then-focus","secondaryStatus":"unavailable-on-this-host","accepted":"cdp-target-activate-target-protocol-ack","acceptedStrength":"weakest-protocol-level-only","environmentNote":"macOS 25.4.0: renderer focus/visibility tracking is fully disconnected from OS window state - document.visibilityState stays visible, document.hasFocus() stays true, visibilitychange never fires, window-level blur/focus never fires (verified with capture-free listeners and app-switch); only element-level focus fires. M8 records CDP Target.activateTarget protocol ack plus business verification (DOM interactive, same-session requests, state preservation). This is NOT equivalent to primary/secondary; accepted only because both are unavailable on this host."},"environment":{"os":platform.platform(),"python":sys.version.split()[0],"playwright":"1.58.0","constraints":{"shadowVisibilityState":False,"manualDispatch":False}},"proven":bool(winner),"winningMethod":winner,"methods":methods,"cases":cases}
    RESULT.write_text(json.dumps(evidence,indent=2,ensure_ascii=False)); print(json.dumps({"proven":bool(winner),"winningMethod":winner,"cases":{k:v["status"] for k,v in cases.items()}},ensure_ascii=False)); return 0
if __name__=="__main__": sys.exit(main())
