export function parseCatalogSubcategoryFilter(value: string, validIds: readonly string[]) {
  const valid = new Set(validIds);
  return [...new Set(value.split(",").map((item) => item.trim()).filter((item) => valid.has(item)))];
}

export function serializeCatalogSubcategoryFilter(values: readonly string[]) {
  return values.length ? values.join(",") : null;
}
