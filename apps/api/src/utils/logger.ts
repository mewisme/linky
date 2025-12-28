import chalk from "chalk";

type LogLevel = "info" | "warn" | "error";

interface LoggerConfig {
  level: LogLevel;
  label: string;
  color: (text: string) => string;
}

const MAX_LABEL_LENGTH = 4;

const truncateLabel = (label: string): string => {
  if (label.length <= MAX_LABEL_LENGTH) {
    return label.toUpperCase();
  }
  return label.slice(0, MAX_LABEL_LENGTH).toUpperCase();
};

const getTimestamp = (): string => {
  const now = new Date();
  const utcTime = now.toISOString();
  return chalk.underline(utcTime);
};

const formatMessage = (args: unknown[]): string => {
  if (args.length === 0) {
    return "";
  }

  return args
    .map((arg) => {
      if (typeof arg === "object" && arg !== null) {
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    })
    .join(" ");
};

const createLogger = (config: LoggerConfig) => {
  const truncatedLabel = truncateLabel(config.label);

  return (...args: unknown[]): void => {
    const timestamp = getTimestamp();
    const label = config.color(`${truncatedLabel}`);
    const message = formatMessage(args);
    const output = `${timestamp} ${label} ${message}`;

    switch (config.level) {
      case "error":
        console.error(output);
        break;
      case "warn":
        console.warn(output);
        break;
      default:
        console.log(output);
    }
  };
};

export const logger = {
  info: createLogger({
    level: "info",
    label: "INFO",
    color: chalk.cyan,
  }),

  warn: createLogger({
    level: "warn",
    label: "WARN",
    color: chalk.yellow,
  }),

  error: createLogger({
    level: "error",
    label: "ERRO",
    color: chalk.red,
  }),

  done: createLogger({
    level: "info",
    label: "DONE",
    color: chalk.green,
  }),

  load: createLogger({
    level: "info",
    label: "LOAD",
    color: chalk.gray,
  }),

  // Custom logger factory for custom labels (automatically truncated to 4 chars)
  custom: (label: string, color: (text: string) => string = chalk.white) => {
    return createLogger({
      level: "info",
      label,
      color,
    });
  },
};
