import type { Logger as PinoLogger } from "pino";
import type { SentryLike } from "./types.js";
import { createBaseLogger } from "./base.js";

export type { Logger } from "pino";

export const initLogger = (sentry?: SentryLike) => {
  const baseLogger = createBaseLogger(sentry);

  const createLogger = (scope?: string): PinoLogger =>
    scope ? baseLogger.child({ scope }) : baseLogger;

  return {
    createLogger,
    logger: createLogger(),
  }
}