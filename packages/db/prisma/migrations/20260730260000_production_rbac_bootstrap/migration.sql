INSERT INTO "permissions" ("id", "key", "description", "createdAt")
VALUES
  (md5('permission:payments.recover'), 'payments.recover', 'Initial permission: payments.recover', CURRENT_TIMESTAMP),
  (md5('permission:erp.catalog.sync'), 'erp.catalog.sync', 'Initial permission: erp.catalog.sync', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "roles" ("id", "key", "name", "description", "isSystem", "createdAt", "updatedAt")
VALUES (
  md5('role:worker_service'),
  'worker_service',
  'Worker Service',
  'Least-privilege role for the VanStro Worker service account.',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("key") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "isSystem" = true,
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "role_permissions" ("id", "roleId", "permissionId", "createdAt")
SELECT
  md5('role-permission:worker_service:' || permissions."key"),
  roles."id",
  permissions."id",
  CURRENT_TIMESTAMP
FROM "roles" roles
JOIN "permissions" permissions ON permissions."key" IN (
  'cli.access',
  'payments.recover',
  'erp.catalog.sync',
  'erp.catalog.read',
  'erp.sync.read',
  'erp.sync.retry'
)
WHERE roles."key" = 'worker_service'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- Attach the dedicated service account to worker_service explicitly after it is
-- created. The migration cannot safely infer which existing account is Worker.
