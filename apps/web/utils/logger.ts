type LogLevel = "info" | "warn" | "error";

interface LoggerConfig {
  level: LogLevel;
  label: string;
  color?: string;
}

// TODO: Add a logger for the web app..

const MAX_LABEL_LENGTH = 4;

const truncateLabel = (label: string): string => {
  if (label.length <= MAX_LABEL_LENGTH) {
    return label.toUpperCase();
  }
  return label.slice(0, MAX_LABEL_LENGTH).toUpperCase();
};

const getTimestamp = (): string => {
  const now = new Date();
  return now.toISOString();
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
    const message = formatMessage(args);

    const output = `[${timestamp}] [${truncatedLabel}] ${message}`;

    const styles = config.color
      ? [`color: ${config.color}`, "font-weight: bold"]
      : [];

    switch (config.level) {
      case "error":
        if (styles.length > 0) {
          console.error(`%c${output}`, styles.join("; "));
        } else {
          console.error(output);
        }
        break;
      case "warn":
        if (styles.length > 0) {
          console.warn(`%c${output}`, styles.join("; "));
        } else {
          console.warn(output);
        }
        break;
      default:
        if (styles.length > 0) {
          console.log(`%c${output}`, styles.join("; "));
        } else {
          console.log(output);
        }
    }
  };
};

export const logger = {
  info: createLogger({
    level: "info",
    label: "INFO",
    color: "#00bcd4", // cyan
  }),

  warn: createLogger({
    level: "warn",
    label: "WARN",
    color: "#ff9800", // orange
  }),

  error: createLogger({
    level: "error",
    label: "ERRO",
    color: "#f44336", // red
  }),

  done: createLogger({
    level: "info",
    label: "DONE",
    color: "#4caf50", // green
  }),

  load: createLogger({
    level: "info",
    label: "LOAD",
    color: "#9e9e9e", // gray
  }),

  // Custom logger factory for custom labels (automatically truncated to 4 chars)
  custom: (label: string, color: string = "#ffffff") => {
    return createLogger({
      level: "info",
      label,
      color,
    });
  },
};

