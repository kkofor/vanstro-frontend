#!/usr/bin/env node
/**
 * Extracts the function/trigger/grant layer of an S01 migration for
 * environments that build tables via `prisma db push` (so migration DDL
 * statements for a fresh library would collide). Keeps:
 *   - CREATE FUNCTION / CREATE OR REPLACE FUNCTION bodies (through the
 *     closing `$fn$;` line and the following ALTER FUNCTION OWNER);
 *   - CREATE TRIGGER statements (one line);
 *   - GRANT / REVOKE / SET ROLE / RESET ROLE lines (top-level ACL lines);
 * Drops CREATE TABLE / ALTER TABLE / CREATE INDEX / DO blocks (DDL).
 */
import { readFileSync } from "node:fs";

// argv[3] === "skip-owner" drops ALTER FUNCTION ... OWNER TO lines. The
// migration74 function layer must not re-set the owner that migration73's
// layer already set (the migrator role is not the function owner then).
const SKIP_OWNER = process.argv[3] === "skip-owner";
const input = readFileSync(process.argv[2], "utf8");
const lines = input.split("\n");
const out = [];
let inFunction = false;
let inTrigger = false;
let pendingFunction = [];

for (const line of lines) {
  const trimmed = line.trim();
  if (/^CREATE (OR REPLACE )?FUNCTION/.test(trimmed)) {
    inFunction = true;
    pendingFunction = [line];
    continue;
  }
  if (inFunction) {
    pendingFunction.push(line);
    // Function body closes when this line contains `END $fn$` (handles both
    // one-line bodies and multi-line bodies with `END $fn$;` on its own line).
    if (/END\s*\$fn\$;?\s*$/.test(trimmed)) {
      out.push(...pendingFunction);
      pendingFunction = [];
      inFunction = false;
    }
    continue;
  }
  if (/^ALTER FUNCTION .* OWNER TO/.test(trimmed)) {
    if (!SKIP_OWNER) out.push(line);
    continue;
  }
  // CREATE TRIGGER must run as the table owner (the migrator role), so it is
  // excluded from the function layer stream.
  if (/^CREATE TRIGGER/.test(trimmed)) {
    continue;
  }
  if (inTrigger) {
    pendingFunction.push(line);
    if (/;\s*$/.test(trimmed)) {
      out.push(...pendingFunction);
      pendingFunction = [];
      inTrigger = false;
    }
    continue;
  }
  // GRANT/REVOKE ACL lines are handled by the harness explicitly (table ACLs
  // as the table owner, function EXECUTE ACLs as the function owner); they are
  // not part of the function layer stream.
  if (/^(GRANT|REVOKE|SET ROLE|RESET ROLE)/.test(trimmed)) {
    continue;
  }
}
process.stdout.write(out.join("\n") + "\n");
