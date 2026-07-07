const MATERIAL_DIMENSION_TOKENS = [
  "mdf",
  "pvc",
  "plywood",
  "painted",
  "primed",
  "finish",
  "white",
  "material"
];

export function formatProductSize(dimensions: string) {
  const [size, ...details] = dimensions.split(",");

  if (details.some((detail) =>
    MATERIAL_DIMENSION_TOKENS.some((token) => detail.toLowerCase().includes(token))
  )) {
    return size.trim();
  }

  return dimensions.trim();
}
