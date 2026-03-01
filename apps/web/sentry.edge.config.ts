import * as Sentry from "@sentry/nextjs";

import { publicEnv } from "@/shared/env/public-env";
import { serverEnv } from "@/shared/env/server-env";

Sentry.init({
  dsn: publicEnv.SENTRY_DSN,
  enabled: serverEnv.isProd || serverEnv.SENTRY_ENABLED,
  sendDefaultPii: true,
  tracesSampleRate: serverEnv.isDev ? 1.0 : 0.1,
  enableLogs: true,
  enableMetrics: true,
  beforeSend(event) {
    if (event.request?.headers) {
      delete event.request.headers["authorization"];
      delete event.request.headers["cookie"];
    }
    return event;
  },
});
