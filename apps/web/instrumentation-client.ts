import * as Sentry from "@sentry/nextjs";

import { publicEnv } from "@/env/public-env";

const isEnabled = !publicEnv.isDev || publicEnv.SENTRY_ENABLED;

Sentry.init({
  dsn: publicEnv.SENTRY_DSN,
  enabled: isEnabled,
  sendDefaultPii: true,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  enableLogs: true,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: isEnabled ? 1.0 : 0,
  integrations: isEnabled
    ? [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
      Sentry.feedbackIntegration({
        colorScheme: "system",
        isNameRequired: true,
        isEmailRequired: true,
      }),
    ]
    : [],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;