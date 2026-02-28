import { createLogger } from "@/utils/logger.js";
import cron from "node-cron";
import { runEconomyMetricsJob } from "./economy-metrics.job.js";
import { runSeasonalDecayJob } from "./seasonal-decay.job.js";
import { runStabilizerJob } from "./economy-stabilizer.job.js";

const logger = createLogger("jobs");

export function startJobs(): void {
  cron.schedule("0 * * * *", () => {
    runSeasonalDecayJob().catch((err) => logger.error(err as Error, "Seasonal decay job error"));
  });
  cron.schedule("5 0 * * *", () => {
    runEconomyMetricsJob().catch((err) => logger.error(err as Error, "Economy metrics job error"));
  });
  cron.schedule("10 0 * * *", () => {
    runStabilizerJob().catch((err) => logger.error(err as Error, "Economy stabilizer job error"));
  });
  logger.info("Scheduled jobs started: seasonal-decay (hourly), economy-metrics (daily 00:05 UTC), economy-stabilizer (daily 00:10 UTC)");
}
