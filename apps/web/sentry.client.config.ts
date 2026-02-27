import * as Sentry from "@sentry/nextjs";

const isEnabled =
  process.env.NODE_ENV === "production" ||
  process.env.SENTRY_ENABLED === "true";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: isEnabled,
  tracesSampleRate: 0.2,
  sendDefaultPii: false,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: isEnabled ? 1.0 : 0,
  integrations: isEnabled
    ? [
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ]
    : [],
});
