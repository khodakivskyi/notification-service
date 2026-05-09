import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow reading markdown files from content/ at build time
  serverExternalPackages: [],
  // Output as standalone for deployment flexibility
  experimental: {},
};

export default nextConfig;
