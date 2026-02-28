import './instrument.js'

import { createLogger } from "@/utils/logger.js";
import { startServer } from "./server.js";

const logger = createLogger("api");

startServer().catch((error: Error) => {
  logger.fatal(error, "Failed to start server");
  process.exit(1);
});