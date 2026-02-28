import cron from "node-cron";
import { createLogger } from "@ws/logger";
import { runEconomyMetricsJob } from "./economy-metrics.job.js";
import { runSeasonalDecayJob } from "./seasonal-decay.job.js";
import { runStabilizerJob } from "./economy-stabilizer.job.js";

const logger = createLogger("jobs");

export function startJobs(): void {
  cron.schedule("0 * * * *", () => {
    runSeasonalDecayJob().catch((err) => logger.error("Seasonal decay job error: %o", err as Error));
  });
  cron.schedule("5 0 * * *", () => {
    runEconomyMetricsJob().catch((err) => logger.error("Economy metrics job error: %o", err as Error));
  });
  cron.schedule("10 0 * * *", () => {
    runStabilizerJob().catch((err) => logger.error("Economy stabilizer job error: %o", err as Error));
  });
  logger.info("Scheduled jobs started: seasonal-decay (hourly), economy-metrics (daily 00:05 UTC), economy-stabilizer (daily 00:10 UTC)");
}
