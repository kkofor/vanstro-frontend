#!/usr/bin/env python3
"""Complete Next production/static build against the live disposable local API."""
import hashlib,json,os,shutil,signal,subprocess,sys,time,urllib.request
from pathlib import Path
from urllib.parse import urlparse
HERE=Path(__file__).parent; ROOT=HERE.parent.parent; OUT=Path(os.environ.get("V11_BROWSER_OUT",ROOT/"tasks/evidence/v11-auth-browser")); OUT.mkdir(parents=True,exist_ok=True)
API=os.environ.get("V11_API","http://127.0.0.1:4565").rstrip("/"); WEB=os.environ.get("V11_WEB","http://127.0.0.1:4564"); RUN_ID=os.environ.get("V11_RUN_ID",""); COMMIT=os.environ.get("V11_TESTED_COMMIT","unknown"); TREE=os.environ.get("V11_TESTED_TREE","unknown")
def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def main():
    result={"schemaVersion":"v11-build-gate-1","runId":RUN_ID,"testedCommit":COMMIT,"testedTree":TREE,"harnessSha256":sha(__file__),"runnerSha256":sha(HERE/"run-v11-token-resume.sh"),"apiBase":API+"/api/v1"}
    try:
        with urllib.request.urlopen(API+"/api/v1/health",timeout=10) as r: result["apiHealthStatus"]=r.status
        port=urlparse(WEB).port or 4564; p=subprocess.run(["lsof",f"-tiTCP:{port}","-sTCP:LISTEN"],capture_output=True,text=True)
        for raw in p.stdout.split():
            try: os.kill(int(raw),signal.SIGTERM)
            except ProcessLookupError: pass
        end=time.monotonic()+15
        while time.monotonic()<end:
            if not subprocess.run(["lsof",f"-tiTCP:{port}","-sTCP:LISTEN"],capture_output=True).stdout: break
            time.sleep(.25)
        shutil.rmtree(ROOT/".next",ignore_errors=True); shutil.rmtree(ROOT/"out",ignore_errors=True)
        env=dict(os.environ); env.update({"VANSTRO_STATIC_EXPORT":"true","VANSTRO_WEBSITE_API_BASE_URL":API+"/api/v1","NEXT_PUBLIC_API_BASE_URL":API+"/api/v1","NEXT_PUBLIC_SITE_URL":"https://vanstro.example","NEXT_PUBLIC_DEMO_READ_ONLY":"true"})
        log=OUT/"build.log"
        with log.open("w") as f: proc=subprocess.run(["pnpm","exec","next","build"],cwd=ROOT,env=env,stdout=f,stderr=subprocess.STDOUT)
        result.update(buildExitCode=proc.returncode,buildLog=str(log.relative_to(ROOT) if log.is_relative_to(ROOT) else log),buildId=(ROOT/".next/BUILD_ID").is_file(),outIndex=(ROOT/"out/index.html").is_file(),outFrench=(ROOT/"out/fr/index.html").is_file())
        result["completed"]=proc.returncode==0 and result["outIndex"] and result["outFrench"]
    except Exception as e:
        result.update(completed=False,error=str(e)[:500],buildExitCode=1)
    result["exitCode"]=0 if result.get("completed") else 1; (OUT/"build-gate-results.json").write_text(json.dumps(result,indent=2,ensure_ascii=False)); print(json.dumps(result,ensure_ascii=False)); return result["exitCode"]
if __name__=="__main__": sys.exit(main())
