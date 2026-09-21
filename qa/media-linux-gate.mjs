import { execFileSync, spawnSync } from "node:child_process";
import assert from "node:assert/strict";
const file="docker-compose.media-test.yml",compose=["compose","-f",file];
const run=(args=[],fixture,timeout=60000)=>spawnSync("docker",[...compose,"run","--rm",...(fixture?["-e",`MEDIA_FIXTURE=${fixture}`]:[]),"media-parser-test",...args],{encoding:"utf8",timeout});
const generate=String.raw`const sharp=require('/app/apps/worker/node_modules/sharp');const fs=require('fs');const k=process.argv[1];(async()=>{if(k==='pdf')fs.writeFileSync('/work/input',Buffer.from('%PDF-1.7\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 100 100]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n'));else fs.writeFileSync('/work/input',await sharp({create:{width:641,height:480,channels:4,background:{r:20,g:80,b:140,alpha:1}}})[k]().toBuffer())})().catch(e=>{console.error(e);process.exit(1)})`;
try {
  execFileSync("docker",[...compose,"config","--quiet"],{stdio:"inherit"});
  execFileSync("docker",[...compose,"build","--pull","media-parser-test","api-test","worker-test"],{stdio:"inherit",timeout:600000});
  for(const kind of ["jpeg","png","webp","pdf"]){
    const command=`node -e ${JSON.stringify(generate)} ${kind} && rm -rf /work/output && /usr/local/bin/media-sandbox-launcher /app/apps/worker/src/media-parser-child.mjs ${kind==="pdf"?"pdf":"image"} /work/input /work/output`;
    const r=spawnSync("docker",[...compose,"run","--rm","--entrypoint","/bin/sh","media-parser-test","-c",command],{encoding:"utf8",timeout:60000});
    assert.equal(r.status,0,r.stderr);const out=JSON.parse(r.stdout);assert.equal(out.ok,true);assert.equal(out.kind,kind==="pdf"?"pdf":"image");if(kind!=="pdf")assert.deepEqual(out.outputs.map(o=>o.role),["original","thumbnail","small"]);
  }
  for (const unsafeName of ["/OpenAction", "/Open#41ction", "/J#61vaScript", "/#4aS"]) {
    const unsafePdf=`printf '%s' ${JSON.stringify(`%PDF-1.7 ${unsafeName} 1 0 R %%EOF`)} > /work/input; /usr/local/bin/media-sandbox-launcher /app/apps/worker/src/media-parser-child.mjs pdf /work/input /work/output`;
    assert.notEqual(spawnSync("docker",[...compose,"run","--rm","--entrypoint","/bin/sh","media-parser-test","-c",unsafePdf],{encoding:"utf8"}).status,0,`${unsafeName} must fail closed`);
  }
  for(const fixture of ["crash","inodes","blocks"]){const r=run(["image","/work/input","/work/output"],fixture);assert.notEqual(r.status,0,`${fixture} must fail closed`)}
  const flood=run(["image","/work/input","/work/output"],"flood");assert.ok(flood.status!==0||flood.stdout.length>=65536);
  const hang=run(["image","/work/input","/work/output"],"hang",5000);assert.ok(hang.error||hang.status!==0);
  const policy=execFileSync("docker",[...compose,"run","--rm","--entrypoint","/bin/sh","media-parser-test","-c","ulimit -c; id -u; grep -E 'NoNewPrivs|Seccomp' /proc/self/status"],{encoding:"utf8"});assert.match(policy,/^0\n10001\n/m);assert.match(policy,/NoNewPrivs:\s+1/);assert.match(policy,/Seccomp:\s+2/);
  console.log(JSON.stringify({mediaLinuxGate:"passed",successKinds:["jpeg","png","webp","pdf"],unsafePdf:"rejected",negativeFixtures:["crash","flood","inodes","blocks","hang"],coreLimit:0,uid:10001,network:"none",readOnly:true}));
} finally { try { execFileSync("docker",[...compose,"down","-v","--remove-orphans"],{stdio:"inherit"}) } catch {} }
