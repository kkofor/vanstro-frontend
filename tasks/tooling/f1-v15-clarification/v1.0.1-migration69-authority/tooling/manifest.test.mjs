import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { MEMBERS, run } from "./manifest.mjs";

async function fixture(){const root=await mkdtemp(join(tmpdir(),"f1-clarification-manifest-"));for(const [i,p] of MEMBERS.entries()){await mkdir(join(root,...p.split("/").slice(0,-1)),{recursive:true});await writeFile(join(root,p),`member-${i}\n`);}return root;}
test("fixed 21-member manifest generates and verifies",async()=>{const root=await fixture();try{const a=await run("generate",root);assert.equal(a.memberCount,21);const b=await run("verify",root,a.manifestSha256);assert.equal(b.manifestSha256,a.manifestSha256);assert.deepEqual(await readFile(join(root,"MANIFEST.sha256")),await readFile(join(root,"MANIFEST.sha256")));}finally{await rm(root,{recursive:true,force:true});}});
test("parent clarification manifest rejects extra member",async()=>{const root=await fixture();try{await writeFile(join(root,"extra.txt"),"extra\n");await assert.rejects(()=>run("generate",root),/EXTRA_MEMBER/);}finally{await rm(root,{recursive:true,force:true});}});
test("manifest rejects missing member",async()=>{const root=await fixture();try{await rm(join(root,MEMBERS[0]));await assert.rejects(()=>run("generate",root),/MEMBER_MISSING/);}finally{await rm(root,{recursive:true,force:true});}});
test("manifest rejects symlink",async()=>{const root=await fixture();try{await rm(join(root,MEMBERS[0]));await symlink(join(root,MEMBERS[1]),join(root,MEMBERS[0]));await assert.rejects(()=>run("generate",root),/SYMLINK_REJECTED/);}finally{await rm(root,{recursive:true,force:true});}});
test("manifest rejects CRLF and missing LF",async()=>{for(const bytes of [Buffer.from("bad\r\n"),Buffer.from("bad")]){const root=await fixture();try{await writeFile(join(root,MEMBERS[0]),bytes);await assert.rejects(()=>run("generate",root),/CR_REJECTED|MISSING_FINAL_LF/);}finally{await rm(root,{recursive:true,force:true});}}});
test("manifest rejects wrong externally authenticated SHA",async()=>{const root=await fixture();try{await run("generate",root);await assert.rejects(()=>run("verify",root,"0".repeat(64)),/MANIFEST_SHA_MISMATCH/);}finally{await rm(root,{recursive:true,force:true});}});
