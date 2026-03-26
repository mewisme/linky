import * as Sentry from "@sentry/node";

import { env } from "./config/env.js";

function isExpectedError(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof Error) {
    if (error.name === "AbortError") return true;
    const msg = error.message.toLowerCase();
    if (msg.includes("aborted") || msg.includes("abort")) return true;
  }
  return false;
}

Sentry.init({
  dsn: env.SENTRY_DSN,
  environment: env.NODE_ENV ?? "development",
  enabled:
    env.isProd ||
    env.SENTRY_ENABLED,
  tracesSampleRate: 0.2,
  sendDefaultPii: false,
  enableLogs: false,
  beforeSend(event, hint) {
    if (isExpectedError(hint?.originalException)) return null;
    if (event.request?.headers) {
      delete event.request.headers["authorization"];
      delete event.request.headers["cookie"];
    }
    return event;
  },
});