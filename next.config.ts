import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow large file uploads (transcripts can be large)
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  // Allow canvas module for server-side diagram rendering
  serverExternalPackages: ["canvas", "puppeteer"],
  // Silence Turbopack warning — no webpack-specific config needed
  turbopack: {},
};

export default nextConfig;
