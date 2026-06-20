import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { remoteImagePatterns } from "./src/shared/config/remote-image-hosts";
import { publicEnv } from "./src/shared/env/public-env";
import { serverEnv } from "./src/shared/env/server-env";
import { withSentryConfig } from "@sentry/nextjs";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

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
  allowedDevOrigins: [...publicEnv.ALLOWED_DEV_ORIGINS],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: remoteImagePatterns,
  },
  logging: {
    browserToTerminal: false,
    fetches: {
      fullUrl: true,
    },
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  org: serverEnv.SENTRY_ORG,
  project: serverEnv.SENTRY_PROJECT,
  authToken: serverEnv.SENTRY_AUTH_TOKEN,
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/api/_sentry",
});
