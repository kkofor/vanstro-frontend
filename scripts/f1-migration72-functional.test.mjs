import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const migration = await readFile(new URL("packages/db/prisma/migrations/20260804130000_f1_v15_runtime_acl_closure/migration.sql", root), "utf8");
const generated = await readFile(new URL("packages/db/src/generated/source-latest-migration.ts", root), "utf8");
const sha = value => createHash("sha256").update(value).digest("hex");

const requiredFunctions = [
  "auth_register_customer_session_v1", "auth_password_challenge_v1", "auth_authenticate_create_session_v1",
  "auth_rotate_session_v1", "auth_session_projection_v1", "auth_revoke_self_session_v1",
  "auth_revoke_all_self_sessions_v1", "auth_issue_password_reset_v1", "auth_consume_password_reset_v1",
  "p02_dashboard_authorization_context_v1", "p04_append_audit_event_v1", "p04_audit_list_v1", "p04_audit_detail_v1",
  "p05_api_create_probe_v1", "p05_api_list_v1", "p05_api_detail_v1", "p05_api_cancel_v1", "p05_api_retry_v1",
  "p06_api_mutate_item_v1", "p06_api_create_notification_v1", "p06_api_get_source_state_v1", "p06_api_update_source_state_v1",
  "p07_api_create_media_job_v1", "p07_api_media_job_detail_v1", "p07_api_lock_media_job_v1", "p07_api_retry_media_job_v1",
  "p10_has_anonymous_analytics_consent_v1"
];

test("migration72 is the only forward functional migration", async () => {
  assert.equal(sha(await readFile(new URL("packages/db/prisma/migrations/20260804120000_f1_v15_compatibility_closure/migration.sql", root))), "fdeb31836e907fa198cf995b973bd6ccd4a62ce03a291b5b9e3fc0317c66e41e");
  assert.match(generated, /SOURCE_LATEST_MIGRATION_NUMBER = 72/);
  assert.match(generated, /20260804130000_f1_v15_runtime_acl_closure/);
  assert.equal((migration.match(/^BEGIN;$/gm) ?? []).length, 1);
  assert.equal((migration.match(/^COMMIT;$/gm) ?? []).length, 1);
  for (const name of requiredFunctions) assert.match(migration, new RegExp(`FUNCTION public\\.${name}`));
  assert.doesNotMatch(migration, /vanstro_auth_runtime|vanstro_p05_api_guard_owner|20260804140000/);
});

test("migration72 grants runtime all normal-path functions", () => {
  for (const name of requiredFunctions) {
    assert.match(migration, new RegExp(`GRANT EXECUTE ON FUNCTION[^;]*public\\.${name}\\(`, "s"));
  }
});

test("migration72 keeps P07 job fencing and functional rollback inputs", () => {
  assert.match(migration, /p07_api_lock_media_job_v1/);
  assert.match(migration, /expected_retry_generation/);
  assert.match(migration, /next_binding_revision<>j\."bindingRevision"\+1/);
  assert.match(migration, /FOR UPDATE/);
});
