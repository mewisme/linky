import chalk from "chalk";

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogOptions {
  level: LogLevel;
  color: (text: string) => string;
  scope?: string;
  customLabel?: string;
}

const MAX_LABEL_LENGTH = 4;
const DEBUG_ENABLED = process.env.DEBUG === "true" || process.env.NODE_ENV !== "production";

const truncate = (s: string) => s.length <= MAX_LABEL_LENGTH ? s.toUpperCase() : s.slice(0, 4).toUpperCase();
const timestamp = () => chalk.underline(new Date().toISOString());
const format = (args: unknown[]) => args.map(a => typeof a === "object" && a !== null ? JSON.stringify(a, null, 2) : String(a)).join(" ");

const write = ({ level, color, scope, customLabel }: LogOptions) => {
  return (...args: unknown[]) => {
    if (level === "debug" && !DEBUG_ENABLED) return;

    const scopePart = scope ? ` [${scope}]` : "";
    const label = customLabel ?? level.toUpperCase();
    const output = `${timestamp()} ${color(truncate(label))}${scopePart} ${format(args)}`;

    const fn =
      level === "error" ? console.error : level === "warn" ? console.warn : console.log;

    fn(output);
  };
};

export class Logger {
  constructor(private readonly scope?: string) { }

  private make(level: LogLevel, color: (t: string) => string, customLabel?: string) {
    return write({
      level,
      scope: this.scope,
      color,
      customLabel,
    });
  }

  get info() {
    return this.make("info", chalk.cyan);
  }

  get warn() {
    return this.make("warn", chalk.yellow);
  }

  get error() {
    return this.make("error", chalk.red);
  }

  get done() {
    return this.make("info", chalk.green, "DONE");
  }

  get load() {
    return this.make("info", chalk.gray, "LOAD");
  }

  get debug() {
    return this.make("debug", chalk.magenta, "DEBUG");
  }

  custom(label: string, color: (t: string) => string = chalk.white) {
    return this.make("info", color, label);
  }
}

export const logger = new Logger();
