import "./infra/sentry/sentry.js";
import { createLogger } from "@ws/logger";
import { startServer } from "./server.js";

const logger = createLogger("api");

startServer().catch((error: Error) => {
  logger.fatal("Failed to start server: %o", error as Error);
  process.exit(1);
});
