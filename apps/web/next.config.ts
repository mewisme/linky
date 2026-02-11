import type { NextConfig } from "next";

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
    removeConsole: process.env.NODE_ENV === "production",
  },
  allowedDevOrigins: [process.env.NEXT_PUBLIC_ALLOWED_DEV_ORIGINS || ""],
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
