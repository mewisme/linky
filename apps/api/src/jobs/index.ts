import { createLogger } from "@/utils/logger.js";
import cron from "node-cron";

const logger = createLogger("jobs");

export function startJobs(): void {
  logger.info("No scheduled jobs configured");
  void cron;
}
