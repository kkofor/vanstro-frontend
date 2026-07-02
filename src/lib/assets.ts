const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function assetPath(path: string) {
  if (!path || /^(https?:|data:|blob:)/.test(path)) return path;

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (basePath && normalizedPath.startsWith(`${basePath}/`)) return normalizedPath;

  return `${basePath}${normalizedPath}`;
}
