import pino, { type Level, type LoggerOptions } from "pino";
import { format } from "node:util";
import type { SentryLike } from "./types.js";

const isDev = process.env.NODE_ENV !== "production";

export const createBaseLogger = (sentry?: SentryLike) => {
  const options: LoggerOptions = {
    level: isDev ? "debug" : "info",
    base: null,

    transport: isDev
      ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss",
          ignore: "scope",
          messageFormat: "{scope} {msg}",
        },
      }
      : undefined,

    hooks: sentry
      ? {
        logMethod(args, method, level) {
          const levelLabel = this.levels.labels[level] as Level;

          const formattedMessage =
            typeof args[0] === "string"
              ? format(...args)
              : typeof args[1] === "string"
                ? format(args[1], ...args.slice(2))
                : "";

          let context: Record<string, unknown> | undefined;

          if (
            typeof args[0] === "object" &&
            args[0] !== null &&
            !(args[0] instanceof Error)
          ) {
            context = args[0] as Record<string, unknown>;
          }

          if (sentry?.logger && formattedMessage) {
            switch (levelLabel) {
              case "trace":
                sentry.logger.trace(formattedMessage, context);
                sentry.captureMessage(formattedMessage, context);
                break;
              case "debug":
                sentry.logger.debug(formattedMessage, context);
                sentry.captureMessage(formattedMessage, context);
                break;
              case "info":
                sentry.logger.info(formattedMessage, context);
                break;
              case "warn":
                sentry.logger.warn(formattedMessage, context);
                sentry.captureMessage(formattedMessage, context);
                break;
              case "error":
                sentry.logger.error(formattedMessage, context);
                sentry.captureException(context, { level: "error" });
                break;
              case "fatal":
                sentry.logger.fatal(formattedMessage, context);
                sentry.captureException(context, { level: "fatal" });
                break;
            }
          }

          method.apply(this, args);
        },
      }
      : undefined,
  };

  return pino(options);
};