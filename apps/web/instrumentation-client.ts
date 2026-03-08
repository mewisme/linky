import * as Sentry from "@sentry/nextjs";

import { publicEnv } from "@/shared/env/public-env";

const isEnabled = !publicEnv.isDev || publicEnv.SENTRY_ENABLED;

Sentry.init({
  dsn: publicEnv.SENTRY_DSN,
  enabled: isEnabled,
  sendDefaultPii: true,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  enableLogs: true,
  enableMetrics: true,
  integrations: isEnabled
    ? [
      Sentry.feedbackIntegration({
        colorScheme: "system",
        showBranding: false,
        autoInject: false
      }),
    ]
    : [],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;