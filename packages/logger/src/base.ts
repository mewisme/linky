import pino, { type Level, type LoggerOptions } from "pino";
import { format } from "node:util";
import type { SentryLike } from "./types.js";

const isDev = process.env.NODE_ENV !== "production";

function extractErrorFromArgs(args: unknown[]): Error | null {
  for (const arg of args) {
    if (arg instanceof Error) return arg;
    if (typeof arg === "object" && arg !== null) {
      const maybeError = (arg as { error?: unknown }).error;
      if (maybeError instanceof Error) return maybeError;
    }
  }
  return null;
}

export const createBaseLogger = (sentry?: SentryLike) => {
  const options: LoggerOptions = {
    level: isDev ? "debug" : "info",
    base: null,
  };

  if (isDev) {
    options.transport = {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss",
        ignore: "scope",
        messageFormat: "{scope} {msg}",
      },
    };
  }

  if (sentry) {
    options.hooks = {
      logMethod(args, method, level) {
        const levelLabel = this.levels.labels[level] as Level;

        const formattedMessage =
          typeof args[0] === "string"
            ? format(...args)
            : typeof args[1] === "string"
              ? format(args[1], ...args.slice(2))
              : "";

        if (formattedMessage) {
          switch (levelLabel) {
            case "trace":
              break;
            case "debug":
              break;
            case "info":
              break;
            case "warn":
              break;
            case "error":
              {
                const err = extractErrorFromArgs(args);
                if (err) {
                  sentry.captureException(err, { level: "error" });
                }
              }
              break;
            case "fatal":
              {
                const err = extractErrorFromArgs(args);
                if (err) {
                  sentry.captureException(err, { level: "fatal" });
                }
              }
              break;
          }
        }

        method.apply(this, args);
      },
    };
  }

  return pino(options);
};