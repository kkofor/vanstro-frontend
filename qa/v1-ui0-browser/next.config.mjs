const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  allowedDevOrigins: ["127.0.0.1"],
  turbopack: {
    root: new URL("../../", import.meta.url).pathname
  }
};

export default nextConfig;
