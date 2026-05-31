/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Container-friendly: emit a self-contained server bundle for Docker/PM2.
  output: "standalone",
  // pdf-parse and mammoth are CommonJS libs used in route handlers — keep them
  // external to the server bundle so they load correctly at runtime.
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse", "mammoth"],
  },
};

export default nextConfig;
