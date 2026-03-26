import * as Sentry from "@sentry/nextjs";

import { publicEnv } from "@/shared/env/public-env";

const isEnabled =
  (process.env.NODE_ENV === "production" || publicEnv.SENTRY_ENABLED) &&
  Boolean(publicEnv.SENTRY_DSN);

Sentry.init({
  dsn: publicEnv.SENTRY_DSN,
  enabled: isEnabled,
  sendDefaultPii: false,
  tracesSampleRate: 0.05,
  enableLogs: false,
  enableMetrics: false,
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