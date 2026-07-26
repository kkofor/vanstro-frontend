/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const staticExport = process.env.VANSTRO_STATIC_EXPORT === "true";

const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  allowedDevOrigins: ["127.0.0.1"],
  ...(staticExport ? { output: "export" } : {}),
  trailingSlash: true,
  basePath,
  assetPrefix: basePath || undefined,
  images: {
    unoptimized: true
  }
};

export default nextConfig;
