import { vi } from "vitest";

const noop = () => { };
const noopLogger = {
  info: noop,
  warn: noop,
  error: noop,
  debug: noop,
  trace: noop,
  fatal: noop,
  child: () => noopLogger,
};

vi.mock("@repo/logger/api", () => ({
  createLogger: () => noopLogger,
}));