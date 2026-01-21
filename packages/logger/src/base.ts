import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

export const baseLogger = pino({
  level: isDev ? "debug" : "info",
  base: null,
  transport: isDev
    ? {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss",
        ignore: "pid,hostname,scope",
        messageFormat: "{scope} | {msg}",
      },
    }
    : undefined,
});
