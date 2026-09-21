#!/usr/bin/env python3
import hashlib,json,os,signal,socket,subprocess,sys,threading,time,urllib.request
from pathlib import Path
HERE=Path(__file__).resolve().parent; REPO=HERE.parents[1]; EVIDENCE=HERE/'evidence'; LOGS=EVIDENCE/'logs'; PARTIAL=EVIDENCE/'result.partial.json'; RESULT=EVIDENCE/'result.json'
def free(port):
 with socket.socket() as s: return s.connect_ex(('127.0.0.1',port))!=0
def wait_url(url,proc,timeout=120):
 end=time.monotonic()+timeout
 while time.monotonic()<end:
  if proc.poll() is not None: raise RuntimeError(f'owned server exited {proc.returncode}')
  try:
   with urllib.request.urlopen(url,timeout=1) as response:
    if response.status<500:return
  except Exception: threading.Event().wait(.1)
 raise RuntimeError('readiness timeout '+url)
def stop(proc):
 if proc.poll() is not None:return
 os.killpg(proc.pid,signal.SIGTERM)
 try:proc.wait(timeout=10)
 except subprocess.TimeoutExpired:os.killpg(proc.pid,signal.SIGKILL);proc.wait(timeout=5)
def canonical_hash(payload):return hashlib.sha256(json.dumps(payload,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def main():
 EVIDENCE.mkdir(exist_ok=True);LOGS.mkdir(exist_ok=True);(EVIDENCE/'screenshots').mkdir(exist_ok=True)
 if not all(free(p)for p in(4480,4481)):raise RuntimeError('exclusive ports must be free')
 tested=subprocess.check_output(['git','rev-parse','HEAD'],cwd=REPO,text=True).strip();fixture_log=(LOGS/'fixture.log').open('wb');web_log=(LOGS/'web.log').open('wb');acceptance_log=(LOGS/'acceptance.log').open('wb');owned=[];rc=2
 try:
  fixture=subprocess.Popen([sys.executable,str(HERE/'fixture.py'),'4481','http://127.0.0.1:4480'],cwd=HERE,stdout=fixture_log,stderr=subprocess.STDOUT,start_new_session=True);owned.append(fixture);wait_url('http://127.0.0.1:4481/control/state',fixture)
  env=os.environ.copy();env.update({'NEXT_PUBLIC_DEMO_READ_ONLY':'true','NEXT_PUBLIC_API_BASE_URL':'http://127.0.0.1:4481/api/v1','VANSTRO_WEBSITE_API_BASE_URL':'http://127.0.0.1:4481/api/v1','NEXT_PUBLIC_WEBSITE_API_BASE_URL':'http://127.0.0.1:4481/api/v1','DASHBOARD_SHELL_V2_MODE':'internal'})
  app=Path(os.environ['VANSTRO_DESKTOP_APP']);web=subprocess.Popen([str(REPO/'node_modules/.bin/next'),'dev','--webpack','-p','4480','-H','127.0.0.1'],cwd=app,env=env,stdout=web_log,stderr=subprocess.STDOUT,start_new_session=True);owned.append(web);wait_url('http://127.0.0.1:4480/dashboard',web)
  run_env=env|{'VANSTRO_TESTED_COMMIT':tested};completed=subprocess.run(['/opt/homebrew/bin/python3.14',str(HERE/'acceptance.py')],cwd=REPO,env=run_env,stdout=acceptance_log,stderr=subprocess.STDOUT,check=False);rc=completed.returncode
 finally:
  for proc in reversed(owned):stop(proc)
  fixture_log.close();web_log.close();acceptance_log.close();closed=all(free(p)for p in(4480,4481));terminated=all(p.poll()is not None for p in owned);payload=json.loads(PARTIAL.read_text())if PARTIAL.exists()else{'counts':{'pass':0,'fail':1,'intentional-skip':0,'not-executed':8},'testedCommit':tested};payload['startStop']={'started':len(owned)==2,'cleanupAttempted':True,'ownedPidsTerminated':terminated,'portsClosed':closed};payload['resultSha256']=canonical_hash(payload);RESULT.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n')
 if not closed or not terminated:return 3
 return rc
if __name__=='__main__':
 try:sys.exit(main())
 except Exception as error:print('runner error:',error,file=sys.stderr);sys.exit(2)
