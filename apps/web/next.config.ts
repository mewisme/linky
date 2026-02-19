import type { NextConfig } from "next";
import { publicEnv, serverEnv } from "./src/env";

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
    removeConsole: serverEnv.NODE_ENV === "production",
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
