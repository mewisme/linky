import { createLogger } from "@/utils/logger.js";

const logger = createLogger("jobs");

export function startJobs(): void {
  logger.info("No scheduled jobs configured");
}
