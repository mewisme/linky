import * as Sentry from "@sentry/nextjs";

import { publicEnv } from "@/shared/env/public-env";
import { serverEnv } from "@/shared/env/server-env";

function isExpectedError(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof Error) {
    const name = error.name;
    if (name === "AbortError") return true;
    const msg = error.message.toLowerCase();
    if (msg.includes("aborted") || msg.includes("abort")) return true;
  }
  return false;
}

Sentry.init({
  dsn: publicEnv.SENTRY_DSN,
  enabled: serverEnv.isProd || serverEnv.SENTRY_ENABLED,
  sendDefaultPii: false,
  tracesSampleRate: serverEnv.isDev ? 1.0 : 0.1,
  enableLogs: false,
  enableMetrics: false,
  beforeSend(event, hint) {
    if (isExpectedError(hint?.originalException)) return null;
    if (event.request?.headers) {
      delete event.request.headers["authorization"];
      delete event.request.headers["cookie"];
    }
    return event;
  },
});
