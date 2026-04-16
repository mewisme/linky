import { vi } from "vitest";

if (!process.env.INTERNAL_WORKER_SECRET) {
  process.env.INTERNAL_WORKER_SECRET = "test-internal-worker-secret-key-min-32-chars";
}

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

vi.mock("@ws/logger", () => ({
  createLogger: () => noopLogger,
  initLogger: () => ({ createLogger: () => noopLogger, logger: noopLogger }),
}));