import { snapshotTodayMetrics } from "@/domains/economy-season/index.js";

export async function runEconomyMetricsJob(): Promise<void> {
  await snapshotTodayMetrics();
}
