import { createLogger } from "@repo/logger/api";
import { startServer } from "./server.js";

const logger = createLogger("API");

startServer().catch((error: Error) => {
  logger.fatal("Failed to start server: %o", error);
  process.exit(1);
});
