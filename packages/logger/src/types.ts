import type * as SentryTypes from "@sentry/node";

export type SentryLike = Pick<
  typeof SentryTypes,
  "captureException" | "captureMessage" | "logger"
>;
