import * as Sentry from "@sentry/node";

const nodeEnv = process.env.NODE_ENV ?? "development";
const sentryDsn = process.env.SENTRY_DSN;
const sentryEnabled = process.env.SENTRY_ENABLED === "true";

Sentry.init({
  dsn: sentryDsn,
  environment: nodeEnv,
  enabled: nodeEnv === "production" || sentryEnabled,
  tracesSampleRate: 0.2,
  sendDefaultPii: false,
  enableLogs: false,
});
