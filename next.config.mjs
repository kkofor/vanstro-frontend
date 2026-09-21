/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const staticExport = process.env.VANSTRO_STATIC_EXPORT === "true";

const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  allowedDevOrigins: ["127.0.0.1"],
  turbopack: {
    root: process.cwd()
  },
  ...(staticExport ? { output: "export" } : {}),
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  basePath,
  assetPrefix: basePath || undefined,
  images: {
    unoptimized: true
  },
  ...(!staticExport
    ? {
        async redirects() {
          return [
            {
              source: "/forgot-password",
              destination: "/account/forgot-password",
              permanent: true
            },
            {
              source: "/forgot-password/",
              destination: "/account/forgot-password",
              permanent: true
            },
            {
              source: "/fr/forgot-password",
              destination: "/fr/account/forgot-password",
              permanent: true
            },
            {
              source: "/fr/forgot-password/",
              destination: "/fr/account/forgot-password",
              permanent: true
            },
            {
              source: "/products/base-end-panel-vep2230-380",
              destination: "/products/vanity-end-panel-vep2230-380/",
              permanent: true
            },
            {
              source: "/products/base-end-panel-vep2230-380/",
              destination: "/products/vanity-end-panel-vep2230-380/",
              permanent: true
            },
            {
              source: "/fr/products/base-end-panel-vep2230-380",
              destination: "/fr/products/vanity-end-panel-vep2230-380/",
              permanent: true
            },
            {
              source: "/fr/products/base-end-panel-vep2230-380/",
              destination: "/fr/products/vanity-end-panel-vep2230-380/",
              permanent: true
            },
            {
              source: "/products/vanity-vs24-394",
              destination: "/products/vanity-cabinet-vs24-384/",
              permanent: true
            },
            {
              source: "/products/vanity-vs24-394/",
              destination: "/products/vanity-cabinet-vs24-384/",
              permanent: true
            },
            {
              source: "/fr/products/vanity-vs24-394",
              destination: "/fr/products/vanity-cabinet-vs24-384/",
              permanent: true
            },
            {
              source: "/fr/products/vanity-vs24-394/",
              destination: "/fr/products/vanity-cabinet-vs24-384/",
              permanent: true
            },
            {
              source: "/products/vanity-v4221-395",
              destination: "/products/vanity-cabinet-v4221-401/",
              permanent: true
            },
            {
              source: "/products/vanity-v4221-395/",
              destination: "/products/vanity-cabinet-v4221-401/",
              permanent: true
            },
            {
              source: "/fr/products/vanity-v4221-395",
              destination: "/fr/products/vanity-cabinet-v4221-401/",
              permanent: true
            },
            {
              source: "/fr/products/vanity-v4221-395/",
              destination: "/fr/products/vanity-cabinet-v4221-401/",
              permanent: true
            },
            {
              source: "/articles/how-to-measure-for-cabinets",
              destination: "/guides/how-to-measure-for-cabinets/",
              permanent: true
            },
            {
              source: "/articles/how-to-measure-for-cabinets/",
              destination: "/guides/how-to-measure-for-cabinets/",
              permanent: true
            },
            {
              source: "/fr/articles/how-to-measure-for-cabinets",
              destination: "/fr/guides/how-to-measure-for-cabinets/",
              permanent: true
            },
            {
              source: "/fr/articles/how-to-measure-for-cabinets/",
              destination: "/fr/guides/how-to-measure-for-cabinets/",
              permanent: true
            },
            {
              source: "/articles/what-finishes-are-available",
              destination: "/guides/what-finishes-are-available/",
              permanent: true
            },
            {
              source: "/articles/what-finishes-are-available/",
              destination: "/guides/what-finishes-are-available/",
              permanent: true
            },
            {
              source: "/fr/articles/what-finishes-are-available",
              destination: "/fr/guides/what-finishes-are-available/",
              permanent: true
            },
            {
              source: "/fr/articles/what-finishes-are-available/",
              destination: "/fr/guides/what-finishes-are-available/",
              permanent: true
            },
            {
              source: "/articles/pickup-and-delivery-options",
              destination: "/guides/pickup-and-delivery-options/",
              permanent: true
            },
            {
              source: "/articles/pickup-and-delivery-options/",
              destination: "/guides/pickup-and-delivery-options/",
              permanent: true
            },
            {
              source: "/fr/articles/pickup-and-delivery-options",
              destination: "/fr/guides/pickup-and-delivery-options/",
              permanent: true
            },
            {
              source: "/fr/articles/pickup-and-delivery-options/",
              destination: "/fr/guides/pickup-and-delivery-options/",
              permanent: true
            }
          ];
        }
      }
    : {})
};

export default nextConfig;
