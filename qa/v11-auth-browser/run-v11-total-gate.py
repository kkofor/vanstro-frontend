#!/usr/bin/env python3
"""Fail-closed V11 total gate: attest -> cross -> token -> lifecycle -> build -> merge."""
import datetime as dt, hashlib, json, os, signal, subprocess, sys, tempfile, uuid
from pathlib import Path
HERE=Path(__file__).parent; ROOT=HERE.parent.parent; OUT=Path(os.environ.get("V11_BROWSER_OUT","tasks/evidence/v11-auth-browser")); OUT=OUT if OUT.is_absolute() else ROOT/OUT
RUNNER=HERE/"run-v11-token-resume.sh"; MERGE=HERE/"merge-acceptance.py"; ATTEST=HERE/"v11-workspace-attest.py"; POLICY=HERE/"attestation-policy.json"
STAGES=[("crossSystem","v11-cross-system-acceptance.py"),("tokenResume","v11-token-resume-acceptance.py"),("lifecycle","v11-lifecycle-gate.py"),("build","v11-build-gate.py")]
EXPECTED_POINTS=["pre-identity","crossSystem/before","crossSystem/after","tokenResume/before","tokenResume/after","lifecycle/before","lifecycle/after","build/before","build/after","merge/before","merge/after"]
ACTIVE_CHILD=None
def run_active(cmd,**kwargs):
    global ACTIVE_CHILD
    ACTIVE_CHILD=subprocess.Popen(cmd,**kwargs); child=ACTIVE_CHILD
    try: return subprocess.CompletedProcess(cmd,child.wait())
    except SystemExit:
        if child.poll() is None:
            try: child.wait(timeout=30)
            except subprocess.TimeoutExpired: child.kill(); child.wait()
        raise
    finally: ACTIVE_CHILD=None
def forward_signal(signum,_frame):
    child=ACTIVE_CHILD
    if child is not None and child.poll() is None: child.send_signal(signum)
    raise SystemExit(128+signum)
def git(*args): return subprocess.run(["git","-C",str(ROOT),*args],capture_output=True,text=True,check=True).stdout.strip()
def attest(point,env,commit=None,tree=None):
    cmd=[sys.executable,str(ATTEST),"--point",point,"--repo",str(ROOT),"--out",str(OUT),"--run-id",env["V11_RUN_ID"],"--policy",str(POLICY)]
    if commit: cmd += ["--tested-commit",commit,"--tested-tree",tree]
    return subprocess.run(cmd,env=env).returncode
def sha256(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def finalize_attestation():
    final_path=OUT/"acceptance-results.json"; attest_path=OUT/"attestation-results.json"
    if not final_path.exists() or not attest_path.exists(): return False
    final=json.loads(final_path.read_text()); attestation=json.loads(attest_path.read_text()); checkpoints=attestation.get("checkpoints",[])
    points=[x.get("point") for x in checkpoints]
    if not attestation.get("allOk") or points!=EXPECTED_POINTS or not all(x.get("ok") for x in checkpoints) or attestation.get("runId")!=final.get("runId") or attestation.get("testedCommit")!=final.get("testedCommit") or attestation.get("testedTree")!=final.get("testedTree"): return False
    final["attestation"]={"allOk":True,"allowlistPolicySha256":attestation.get("allowlistPolicySha256"),"checkpointCount":len(checkpoints),"lastCheckpoint":"merge/after","attestationResultsSha256":sha256(attest_path)}
    final.setdefault("provenance",{})["attestationResultsSha256"]=sha256(attest_path)
    temp=final_path.with_suffix(".tmp"); temp.write_text(json.dumps(final,indent=2,ensure_ascii=False)); os.replace(temp,final_path); return True
def run_gate():
    OUT.mkdir(parents=True,exist_ok=True)
    for stale in ("attestation-results.json","cross-system-results.json","token-resume-results.json","lifecycle-gate-results.json","build-gate-results.json","acceptance-results.json","lifecycle-manual-ack"):(OUT/stale).unlink(missing_ok=True)
    run_id=os.environ.get("V11_RUN_ID") or dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")+"-"+uuid.uuid4().hex[:8]
    cache=Path(tempfile.mkdtemp(prefix="v11-pycache-")); env=dict(os.environ); env.update({"V11_RUN_ID":run_id,"V11_BROWSER_OUT":str(OUT),"PYTHONPYCACHEPREFIX":str(cache)})
    if attest("pre-identity",env)!=0: print("total gate FAILED: pre-identity workspace attestation",file=sys.stderr); return 1
    commit=os.environ.get("V11_TESTED_COMMIT") or git("rev-parse","HEAD"); tree=os.environ.get("V11_TESTED_TREE") or git("rev-parse","HEAD^{tree}")
    if bool(os.environ.get("V11_TESTED_COMMIT")) != bool(os.environ.get("V11_TESTED_TREE")): return 1
    if git("rev-parse",f"{commit}^{{tree}}")!=tree: return 1
    env.update({"V11_TESTED_COMMIT":commit,"V11_TESTED_TREE":tree})
    # Stage outputs were cleared before pre-identity so a reused runId cannot append old evidence.
    exit_codes={}
    for name,script in STAGES:
        if attest(f"{name}/before",env,commit,tree)!=0: print(f"total gate FAILED: {name} pre-stage attestation",file=sys.stderr); return 1
        stage_env=dict(env); stage_env["V11_ACCEPTANCE_SCRIPT"]=script
        print(f"\n===== total gate stage: {name} ({script}) =====",flush=True); proc=run_active(["bash",str(RUNNER)],env=stage_env); exit_codes[name]=proc.returncode
        if attest(f"{name}/after",env,commit,tree)!=0: print(f"total gate FAILED: {name} post-stage attestation",file=sys.stderr); return 1
        print(f"===== {name} exit code: {proc.returncode} =====",flush=True)
    if attest("merge/before",env,commit,tree)!=0: return 1
    proc=run_active([sys.executable,str(MERGE)],env=env); exit_codes["merge"]=proc.returncode
    if attest("merge/after",env,commit,tree)!=0:
        (OUT/"acceptance-results.json").unlink(missing_ok=True); return 1
    if not finalize_attestation():
        (OUT/"acceptance-results.json").unlink(missing_ok=True); print("total gate FAILED: authoritative merge/after binding",file=sys.stderr); return 1
    failed=[name for name,code in exit_codes.items() if code!=0]
    print(f"total gate runId={run_id} testedCommit={commit} testedTree={tree}"); [print(f"  {n}: exit={c}") for n,c in exit_codes.items()]
    if failed: print(f"total gate FAILED (failing stages: {', '.join(failed)})"); return 1
    print("total gate PASSED"); return 0

def main():
    signal.signal(signal.SIGINT,forward_signal); signal.signal(signal.SIGTERM,forward_signal)
    runtime=[]; env_path=ROOT/".env"
    raw=subprocess.run(["git","-C",str(ROOT),"ls-files","--others","--ignored","--exclude-standard","-z","--","qa"],capture_output=True,check=True).stdout
    ignored=[p.decode() for p in raw.split(b"\0") if p]
    def evidence_path(rel):
        return any(part=="evidence" or part.startswith("evidence-") or part=="logs" for part in Path(rel).parts)
    cache_dirs=set()
    for rel in ignored:
        parts=Path(rel).parts
        if "__pycache__" in parts: cache_dirs.add(str(Path(*parts[:parts.index("__pycache__")+1])))
    runtime.extend(sorted(cache_dirs))
    for rel in ignored:
        if evidence_path(rel) or any(rel==d or rel.startswith(d+"/") for d in cache_dirs): continue
        runtime.append(rel)
    if env_path.exists(): runtime.append(".env")
    moved=[]
    if runtime:
        if os.environ.get("V11_QUARANTINE_RUNTIME_ENV")!="true":
            print(f"total gate FAILED: {len(runtime)} runtime untracked inputs; set V11_QUARANTINE_RUNTIME_ENV=true for reversible quarantine",file=sys.stderr); return 1
        qdir=Path(tempfile.mkdtemp(prefix="v11-runtime-quarantine-"))
        for rel in sorted(set(runtime),key=lambda p:len(Path(p).parts)):
            src=ROOT/rel
            if not src.exists(): continue
            dst=qdir/rel; dst.parent.mkdir(parents=True,exist_ok=True); os.replace(src,dst); moved.append((src,dst))
    try:
        return run_gate()
    finally:
        for src,dst in reversed(moved):
            if dst.exists(): src.parent.mkdir(parents=True,exist_ok=True); os.replace(dst,src)

if __name__=="__main__": sys.exit(main())
