import type { NextConfig } from "next";
import { publicEnv } from "./src/env/public-env";
import { serverEnv } from "./src/env/server-env";

const nextConfig: NextConfig = {
  transpilePackages: ["@ws/ui"],
  experimental: {
    optimizePackageImports: [
      "country-flag-icons",
      "lucide-react",
      "@tabler/icons-react",
      "@ws/ui",
    ],
  },
  compiler: {
    removeConsole: serverEnv.isProd,
  },
  allowedDevOrigins: [publicEnv.ALLOWED_DEV_ORIGINS],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
