import { logger } from "./utils/logger.js";
import { startServer } from "./server.js";

startServer().catch((error) => {
  logger.error("Failed to start server:", error);
  process.exit(1);
});
