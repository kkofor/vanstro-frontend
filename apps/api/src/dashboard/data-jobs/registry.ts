import { DataJobError } from "./errors.js";

export const FOUNDATION_SAMPLE_OBJECT_KEY = "foundation.sample" as const;
export const FOUNDATION_SAMPLE_FIELDS = [
  "external_key",
  "label",
  "state",
  "quantity",
  "effective_date",
  "note",
] as const;

export type FoundationSampleField = (typeof FOUNDATION_SAMPLE_FIELDS)[number];
export type DataJobDirection = "import" | "export";

export interface DataJobObjectDescriptor {
  readonly key: string;
  readonly enabled: boolean;
  readonly directions: readonly DataJobDirection[];
  readonly schemaVersion: string;
}

export const DATA_JOB_REGISTRY_VERSION = "dashboard.data-jobs.registry.v1";
export const FOUNDATION_SAMPLE_SCHEMA_VERSION = "foundation.sample.schema.v1";

const descriptors = new Map<string, DataJobObjectDescriptor>([
  [FOUNDATION_SAMPLE_OBJECT_KEY, {
    key: FOUNDATION_SAMPLE_OBJECT_KEY,
    enabled: true,
    directions: ["import", "export"],
    schemaVersion: FOUNDATION_SAMPLE_SCHEMA_VERSION,
  }],
  ["category", { key: "category", enabled: false, directions: [], schemaVersion: "reserved" }],
  ["product_metadata", { key: "product_metadata", enabled: false, directions: [], schemaVersion: "reserved" }],
  ["media_metadata", { key: "media_metadata", enabled: false, directions: [], schemaVersion: "reserved" }],
]);

export function resolveDataJobObject(key: string, direction: DataJobDirection): DataJobObjectDescriptor {
  const descriptor = descriptors.get(key);
  if (!descriptor) {
    throw new DataJobError("OBJECT_NOT_SUPPORTED", "The requested data object is not supported.");
  }
  if (!descriptor.enabled || !descriptor.directions.includes(direction)) {
    throw new DataJobError("OBJECT_DISABLED", "The requested data object is disabled.");
  }
  return descriptor;
}

export function listEnabledDataJobObjects(): readonly DataJobObjectDescriptor[] {
  return [...descriptors.values()].filter((descriptor) => descriptor.enabled);
}
