#!/usr/bin/env python3
"""Fail-closed Git workspace/tree/runtime-input attestation (stdlib only)."""
import argparse, datetime, fnmatch, hashlib, json, os, subprocess, sys
from pathlib import Path

def run(repo,*args,check=False):
    return subprocess.run(["git","-C",str(repo),*args],capture_output=True,check=check)
def text(repo,*args): return run(repo,*args,check=True).stdout.decode().strip()
def sha(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def zpaths(raw): return [x.decode() for x in raw.split(b"\0") if x]
def matches(path,patterns): return any(fnmatch.fnmatch(path,p) for p in patterns)
def main():
    ap=argparse.ArgumentParser(); ap.add_argument("--point",required=True); ap.add_argument("--repo",required=True); ap.add_argument("--out",required=True); ap.add_argument("--run-id",required=True); ap.add_argument("--tested-commit"); ap.add_argument("--tested-tree"); ap.add_argument("--policy"); args=ap.parse_args()
    repo=Path(args.repo).resolve(); out=Path(args.out).resolve(); out.mkdir(parents=True,exist_ok=True)
    policy_path=Path(args.policy or repo/"qa/v11-auth-browser/attestation-policy.json").resolve(); policy=json.loads(policy_path.read_text()); policy_sha=sha(policy_path)
    commit=args.tested_commit or text(repo,"rev-parse","HEAD"); tree=args.tested_tree or text(repo,"rev-parse","HEAD^{tree}"); errors=[]
    head=text(repo,"rev-parse","HEAD"); head_tree=text(repo,"rev-parse","HEAD^{tree}")
    if head!=commit: errors.append("HEAD does not equal testedCommit")
    if head_tree!=tree: errors.append("HEAD tree does not equal testedTree")
    if run(repo,"ls-files","-u").stdout: errors.append("unmerged index entries exist")
    index_tree=text(repo,"write-tree")
    staged=run(repo,"diff","--quiet","--cached",commit,"--").returncode==0
    unstaged=run(repo,"diff","--quiet","--").returncode==0
    combined=run(repo,"diff","--quiet",commit,"--").returncode==0
    if index_tree!=tree or not staged: errors.append("staged/index tree differs from testedTree")
    if not unstaged or not combined: errors.append("tracked worktree differs from testedTree")
    prefix=os.environ.get("PYTHONPYCACHEPREFIX",""); prefix_path=Path(prefix).resolve() if prefix else None; prefix_ok=bool(prefix_path and prefix_path.exists() and repo not in prefix_path.parents and prefix_path!=repo)
    if not prefix_ok: errors.append("PYTHONPYCACHEPREFIX must be an existing directory outside repo")
    nonignored=zpaths(run(repo,"ls-files","--others","--exclude-standard","-z").stdout)
    ignored=zpaths(run(repo,"ls-files","--others","--ignored","--exclude-standard","-z").stdout)
    allowed=[]; derived=[]; runtime_rejected=[]; default_rejected=[]
    for path in sorted(set(nonignored+ignored)):
        if matches(path,policy["allowUntracked"]):
            if "__pycache__" in path and not prefix_ok: runtime_rejected.append(path)
            else: allowed.append(path)
        elif matches(path,policy["derivedIgnoredRoots"]): derived.append(path)
        elif matches(path,policy["runtimeReject"]): runtime_rejected.append(path)
        else: default_rejected.append(path)
    rejected=runtime_rejected+default_rejected
    if rejected: errors.append(f"runtime/unapproved untracked inputs: {len(rejected)}")
    bindings=[]
    for rel in policy["blobBindings"]:
        live=repo/rel; entry=text(repo,"ls-tree",tree,"--",rel).split()
        item={"path":rel,"existsInTree":bool(entry),"diskBlobEqual":False}
        if not entry or not live.is_file(): errors.append(f"blob binding missing: {rel}")
        else:
            oid=entry[2]; live_oid=text(repo,"hash-object",str(live)); item.update(blobOid=oid,liveBlobOid=live_oid,diskBlobEqual=oid==live_oid,blobSha256=sha(live))
            if oid!=live_oid: errors.append(f"live file differs from testedTree blob: {rel}")
        bindings.append(item)
    checkpoint={"point":args.point,"at":datetime.datetime.now(datetime.timezone.utc).isoformat(),"ok":not errors,"errors":errors,"tracked":{"testedCommit":commit,"testedTree":tree,"head":head,"headTree":head_tree,"indexTree":index_tree,"stagedClean":staged,"unstagedClean":unstaged,"combinedClean":combined},"pythonCache":{"prefixOutsideRepo":prefix_ok},"runtimeUntracked":{"scanOk":not rejected,"allowed":allowed,"derivedIgnored":derived,"runtimeRejected":runtime_rejected,"defaultRejected":default_rejected,"rejected":rejected},"blobBindings":bindings}
    evidence_path=out/"attestation-results.json"; evidence={"schemaVersion":"v11-workspace-attestation-1","runId":args.run_id,"testedCommit":commit,"testedTree":tree,"allowlistPolicySha256":policy_sha,"checkpoints":[],"allOk":True}
    if evidence_path.exists():
        old=json.loads(evidence_path.read_text())
        if old.get("runId")==args.run_id: evidence=old
    evidence["checkpoints"].append(checkpoint); evidence["allOk"]=all(x.get("ok") for x in evidence["checkpoints"]); evidence_path.write_text(json.dumps(evidence,indent=2,ensure_ascii=False))
    print(json.dumps({"point":args.point,"ok":checkpoint["ok"],"errors":errors,"rejected":rejected},ensure_ascii=False)); return 0 if checkpoint["ok"] else 1
if __name__=="__main__": sys.exit(main())
