import { deactivateSeason, getExpiredUnprocessedSeason, runDecayForSeason } from "@/domains/economy-season/index.js";
import { createLogger } from "@ws/logger";

const logger = createLogger("jobs:seasonal-decay");

export async function runSeasonalDecayJob(): Promise<void> {
  const season = await getExpiredUnprocessedSeason();
  if (!season) {
    return;
  }

  logger.info("Running seasonal decay for season id=%s name=%s", season.id, season.name);
  await runDecayForSeason(season.id);
  await deactivateSeason(season.id);
  logger.info("Seasonal decay completed and season deactivated id=%s", season.id);
}
