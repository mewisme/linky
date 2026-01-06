import { logger } from "./utils/logger.js";
import { startServer } from "./server.js";

// Start the server
startServer().catch((error) => {
  logger.error("Failed to start server:", error);
  process.exit(1);
});
