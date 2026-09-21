import type { DashboardAuthorization } from "../api/api-contract.ts";
import { MEDIA_CONTENT_TYPES, MEDIA_USAGE_ENTITY_TYPES, type MediaAsset, type MediaLocaleMetadata, type MediaScope, type MediaUploadIntent, type MediaUsage } from "./p07-media.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
const USAGE_SLOTS = { product: ["gallery", "primary"], product_variant: ["gallery", "primary"], category: ["hero", "tile"], cms_module: ["media", "hero"], article: ["hero", "inline"], dealer: ["logo", "gallery"] } as const;

type Capability = DashboardAuthorization["mediaFoundationV1"];
type AssetWrite = { actorKey: string; asset: MediaAsset; assetId: string; expectedScope: MediaScope; signal?: AbortSignal };
export type MediaMetadataWrite = { version: number; decorative: boolean; focalPoint?: { x: number; y: number }; credit: string | null; copyright: string | null; tags: string[]; locales: MediaLocaleMetadata[] };
export type MediaUsageWrite = { expectedAssetVersion: number; entityType: typeof MEDIA_USAGE_ENTITY_TYPES[number]; entityId: string; slot: MediaUsage["slot"] };

export type MediaWriteOperation =
  | { kind: "createUploadIntent"; actorKey: string; filename: string; mediaKind: "image" | "pdf"; declaredContentType: typeof UPLOAD_TYPES[number]; expectedBytes: number; signal?: AbortSignal }
  | { kind: "uploadIntentContent"; actorKey: string; intent: MediaUploadIntent; assetId: string; body: Blob; signal?: AbortSignal }
  | (AssetWrite & { kind: "updateMetadata"; metadata: MediaMetadataWrite })
  | (AssetWrite & { kind: "attachUsage"; usageTarget: MediaUsageWrite })
  | (AssetWrite & { kind: "detachUsage"; usage: MediaUsage; usageId: string })
  | (AssetWrite & { kind: "archive"; expectedAssetVersion: number })
  | (AssetWrite & { kind: "restore"; expectedAssetVersion: number })
  | (AssetWrite & { kind: "retryVariant"; idempotencyKey: string });

export type AuthorizedMediaWrite = { path: string; init: RequestInit };
export type MediaWriteFetch = (path: string, init: RequestInit) => Promise<Response>;

function sameScope(left: MediaScope, right: MediaScope) { return JSON.stringify(left) === JSON.stringify(right); }
function positiveVersion(value: number) { if (!Number.isSafeInteger(value) || value < 0) throw new TypeError("Invalid Media version."); }
function json(body: unknown, signal?: AbortSignal): RequestInit { return { body: JSON.stringify(body), signal, headers: { "Content-Type": "application/json" } }; }
function requireAsset(operation: AssetWrite, capability: Capability, action: keyof Capability["actions"], perAsset: keyof MediaAsset["capabilities"]) {
  if (operation.asset.id !== operation.assetId || !UUID.test(operation.assetId)) throw new TypeError("Media asset identity mismatch.");
  if (!sameScope(operation.asset.authorizationScope, operation.expectedScope)) throw new TypeError("Media asset scope mismatch.");
  if (!capability.actions[action] || !operation.asset.capabilities[perAsset]) throw new TypeError("Media write capability unavailable.");
}
function metadataBody(value: MediaMetadataWrite, asset: MediaAsset) {
  positiveVersion(value.version);
  if (value.version !== asset.version || typeof value.decorative !== "boolean" || value.credit !== null && (typeof value.credit !== "string" || value.credit.length > 500) || value.copyright !== null && (typeof value.copyright !== "string" || value.copyright.length > 500)) throw new TypeError("Invalid Media metadata.");
  if (!Array.isArray(value.tags) || value.tags.length > 32 || JSON.stringify(value.tags) !== JSON.stringify([...new Set(value.tags)].sort()) || value.tags.some(tag => !tag || tag.length > 64)) throw new TypeError("Invalid Media tags.");
  if (!Array.isArray(value.locales) || value.locales.length !== 2 || value.locales[0]?.locale !== "en-CA" || value.locales[1]?.locale !== "fr-CA") throw new TypeError("Invalid Media locales.");
  for (const locale of value.locales) if (locale.altText !== null && locale.altText.length > 500 || locale.caption !== null && locale.caption.length > 1000 || value.decorative && locale.altText !== null) throw new TypeError("Invalid Media locale metadata.");
  if (value.focalPoint && (asset.kind !== "image" || !Number.isFinite(value.focalPoint.x) || !Number.isFinite(value.focalPoint.y) || value.focalPoint.x < 0 || value.focalPoint.x > 1 || value.focalPoint.y < 0 || value.focalPoint.y > 1)) throw new TypeError("Invalid Media focal point.");
  return value;
}

export function authorizeMediaWrite(operation: MediaWriteOperation, capability: Capability, currentActorKey: string): AuthorizedMediaWrite {
  if (!capability.enabled) throw new TypeError("Media foundation capability unavailable.");
  if (!operation.actorKey || operation.actorKey !== currentActorKey) throw new TypeError("Stale media actor generation.");
  switch (operation.kind) {
    case "createUploadIntent": {
      if (!capability.actions.create || !capability.upload.enabled || !UPLOAD_TYPES.includes(operation.declaredContentType) || !operation.filename || operation.filename.length > 255 || !Number.isSafeInteger(operation.expectedBytes) || operation.expectedBytes < 1) throw new TypeError("Invalid Media upload intent.");
      const expectedKind = operation.declaredContentType === "application/pdf" ? "pdf" : "image";
      if (operation.mediaKind !== expectedKind || !capability.upload[expectedKind] || operation.expectedBytes > capability.upload.maxBytes[expectedKind]) throw new TypeError("Media upload is outside capability limits.");
      return { path: "/dashboard/media/upload-intents", init: { method: "POST", ...json({ filename: operation.filename, kind: operation.mediaKind, declaredContentType: operation.declaredContentType, expectedBytes: operation.expectedBytes }, operation.signal) } };
    }
    case "uploadIntentContent":
      if (!capability.actions.create || !capability.upload.enabled || !capability.upload[operation.intent.asset.kind] || operation.intent.asset.id !== operation.assetId || !UUID.test(operation.intent.intentId) || !UUID.test(operation.assetId) || !(operation.body instanceof Blob) || operation.body.size < 1 || operation.body.size > capability.upload.maxBytes[operation.intent.asset.kind]) throw new TypeError("Media upload intent identity mismatch.");
      return { path: `/dashboard/media/upload-intents/${operation.intent.intentId}/content`, init: { method: "PUT", body: operation.body, signal: operation.signal, headers: { "Content-Type": "application/octet-stream", "X-Media-Upload-Token": operation.intent.uploadToken } } };
    case "updateMetadata":
      requireAsset(operation, capability, "update", "update");
      return { path: `/dashboard/media/${operation.assetId}/metadata`, init: { method: "PATCH", ...json(metadataBody(operation.metadata, operation.asset), operation.signal) } };
    case "attachUsage": {
      requireAsset(operation, capability, "update", "update");
      const target = operation.usageTarget; positiveVersion(target.expectedAssetVersion);
      if (target.expectedAssetVersion !== operation.asset.version || !MEDIA_USAGE_ENTITY_TYPES.includes(target.entityType) || !UUID.test(target.entityId) || !(USAGE_SLOTS[target.entityType] as readonly string[]).includes(target.slot)) throw new TypeError("Invalid Media usage target.");
      return { path: `/dashboard/media/${operation.assetId}/usages`, init: { method: "POST", ...json(target, operation.signal) } };
    }
    case "detachUsage":
      requireAsset(operation, capability, "update", "update");
      if (operation.usage.id !== operation.usageId || !UUID.test(operation.usageId)) throw new TypeError("Media usage identity mismatch.");
      return { path: `/dashboard/media/${operation.assetId}/usages/${operation.usageId}`, init: { method: "DELETE", signal: operation.signal } };
    case "retryVariant": {
      requireAsset(operation, capability, "manageVariants", "manageVariants");
      const binding = operation.asset.retryBinding;
      if (!binding || !operation.idempotencyKey || operation.idempotencyKey.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(operation.idempotencyKey)) throw new TypeError("Media retry binding unavailable.");
      return { path: `/dashboard/media/${operation.assetId}/variants/retry`, init: { method: "POST", ...json({ expectedAssetVersion: operation.asset.version, expectedJobId: binding.jobId, expectedJobVersion: binding.jobVersion, variants: binding.variants }, operation.signal), headers: { "Content-Type": "application/json", "Idempotency-Key": operation.idempotencyKey } } };
    }
    case "archive":
    case "restore":
      requireAsset(operation, capability, operation.kind, operation.kind);
      positiveVersion(operation.expectedAssetVersion);
      if (operation.expectedAssetVersion !== operation.asset.version) throw new TypeError("Stale Media asset version.");
      return { path: `/dashboard/media/${operation.assetId}/${operation.kind}`, init: { method: "POST", ...json({ version: operation.expectedAssetVersion }, operation.signal) } };
  }
}

export async function executeMediaWrite(operation: MediaWriteOperation, capability: Capability, currentActorKey: string, fetcher: MediaWriteFetch, onUnauthorized: () => void) {
  const authorized = authorizeMediaWrite(operation, capability, currentActorKey);
  const response = await fetcher(authorized.path, authorized.init);
  if (response.status === 401) onUnauthorized();
  return response;
}
