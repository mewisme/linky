import { Logger } from "./utils/logger.js";
import { startServer } from "./server.js";

const logger = new Logger("Index");

startServer().catch((error) => {
  logger.error("Failed to start server:", error);
  process.exit(1);
});
