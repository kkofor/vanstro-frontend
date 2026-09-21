import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const migration = readFileSync(new URL("../prisma/migrations/20260803110000_dashboard_p08_runtime_permission_boundary/migration.sql", import.meta.url), "utf8");

test("P08 migration64 revokes all direct runtime verbs on all four tables", () => {
  assert.match(migration, /REVOKE ALL ON TABLE public\.dashboard_import_batch, public\.dashboard_import_row, public\.dashboard_export_request, public\.foundation_sample FROM PUBLIC, vanstro_runtime/);
  for (const table of ["dashboard_import_batch", "dashboard_import_row", "dashboard_export_request", "foundation_sample"]) {
    assert.match(migration, new RegExp(`has_table_privilege\\('vanstro_runtime','public\\.'\\|\\|rel,verb\\)`));
    assert.ok(migration.includes(`'${table}'`));
  }
  assert.doesNotMatch(migration, /GRANT (?:SELECT|INSERT|UPDATE|DELETE).*TO vanstro_runtime/);
});

test("P08 migration64 functions are fixed security-definer boundaries", () => {
  for (const fn of ["p08_create_import", "p08_import_list", "p08_import_detail", "p08_import_finalize_context", "p08_transition_import", "p08_import_rows", "p08_create_export", "p08_export_list", "p08_export_detail", "p08_transition_export", "p08_commit_sample", "p08_export_samples", "p08_purge_row_payloads"]) {
    assert.ok(migration.includes(`CREATE FUNCTION public.${fn}(`), fn);
  }
  assert.doesNotMatch(migration, /EXECUTE\s+format|dynamic SQL|table_name|column_name|operation_name/i);
  assert.match(migration, /SECURITY DEFINER SET search_path = pg_catalog, public/g);
  assert.match(migration, /vanstro_p08_guard_owner/);
  assert.match(migration, /REVOKE EXECUTE ON FUNCTION[\s\S]+FROM PUBLIC/);
});

test("P08 application source no longer uses direct Prisma access to protected tables", () => {
  const source = readFileSync(new URL("../../../apps/api/src/dashboard/data-jobs.ts", import.meta.url), "utf8");
  for (const client of ["dashboardImportBatch", "dashboardImportRow", "dashboardExportRequest", "foundationSample"]) assert.doesNotMatch(source, new RegExp(`\\.${client}\\.`));
  assert.match(source, /p08CreateImport/);
  assert.match(source, /p08TransitionImport/);
  assert.match(source, /p08CreateExport/);
});
