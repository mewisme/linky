import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/ui"],
  experimental: {
    optimizePackageImports: ["@repo/ui"],
  },
  allowedDevOrigins: ["*.mewis.me"]
};

export default nextConfig;
