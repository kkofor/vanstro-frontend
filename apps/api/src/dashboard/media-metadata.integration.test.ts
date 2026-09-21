import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@vanstro/db";
import { createSession } from "../auth/session.js";
import { createApp } from "../app.js";

const prisma = new PrismaClient({ datasources: { db: { url: process.env.VANSTRO_TEST_SETUP_DATABASE_URL ?? process.env.DATABASE_URL } } });

function disposable(t: test.TestContext) {

  const name = new URL(process.env.DATABASE_URL ?? "postgresql://localhost/unknown").pathname.slice(1);
  if (!/(test|smoke|disposable)/i.test(name)) {
    t.skip("P07 metadata proof requires an owned disposable database");
    return false;
  }
  return true;
}

function assertStrictConsumerTags(value: unknown) {
  assert.ok(value && typeof value === "object" && !Array.isArray(value));
  const tags = (value as { tags?: unknown }).tags;
  assert.ok(Array.isArray(tags));
  assert.ok(tags.every(tag => typeof tag === "string" && tag === tag.normalize("NFC").trim()));
  assert.deepEqual(tags, [...new Set(tags)].sort());
  return tags;
}

test("P07 metadata PATCH returns sorted unique normalized tags", async t => {
  if (!disposable(t)) return;
  const suffix = randomUUID();
  const permissionKeys = ["dashboard.access", "media.read", "media.update"];
  await prisma.permission.createMany({ data: permissionKeys.map(key => ({ key, description: key })), skipDuplicates: true });
  const permissions = await prisma.permission.findMany({ where: { key: { in: permissionKeys } } });
  const role = await prisma.role.create({ data: { key: `p07-metadata-${suffix}`, name: "P07 metadata", rolePermissions: { create: permissions.map(permission => ({ permissionId: permission.id })) } } });
  const user = await prisma.user.create({ data: { email: `p07-metadata-${suffix}@example.test`, kind: "admin", status: "active", userRoles: { create: { roleId: role.id } } } });
  const asset = await prisma.mediaAsset.create({ data: { contractVersion: "media-asset.v1", schemaVersion: "media-asset-schema.v1", registryVersion: "media-registry.v1", kind: "image", status: "uploading", originalFilename: "metadata.jpg", safeDisplayName: "metadata.jpg", declaredContentType: "image/jpeg", expectedBytes: 4n, source: "dashboard_upload", provenanceOrigin: "human_upload", storageProvider: "private_filesystem.v1", processingPolicyVersion: "media-processing.v1", securityPolicyVersion: "media-security.v1", processingConfigHash: "m".repeat(43), variantSetState: "unresolved", tags: [], authorizationScopeKind: "global", dealerIds: [], locationIds: [], createdByActorType: "admin_user", createdByActorId: user.id, effectiveRoles: [], permissionGrants: [], contextRevision: `metadata-${suffix}`, retentionClass: "default", retentionPolicyVersion: "media-retention.v1", requestId: `metadata-${suffix}` } });
  const token = (await createSession(user.id)).accessToken;
  const response = await createApp().request(`/api/v1/dashboard/media/${asset.id}/metadata`, { method: "PATCH", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ version: asset.version, tags: ["z", " a ", "z", "é", "é"] }) });
  assert.equal(response.status, 200, await response.clone().text());
  const payload = await response.json() as { data: unknown };
  assert.deepEqual(assertStrictConsumerTags(payload.data), ["a", "z", "é"]);
  const persisted = await prisma.mediaAsset.findUniqueOrThrow({ where: { id: asset.id } });
  assert.deepEqual(persisted.tags, ["a", "z", "é"]);
});
