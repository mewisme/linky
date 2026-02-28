import * as Sentry from "@sentry/node";

import { env } from "./config/env.js";

Sentry.init({
  dsn: env.SENTRY_DSN,
  environment: env.NODE_ENV ?? "development",
  enabled:
    env.isProd ||
    env.SENTRY_ENABLED,
  tracesSampleRate: 0.2,
  sendDefaultPii: true,
  enableLogs: true,
  beforeSend(event) {
    if (event.request?.headers) {
      delete event.request.headers["authorization"];
      delete event.request.headers["cookie"];
    }
    return event;
  },
});