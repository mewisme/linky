import { createLogger } from "@/utils/logger.js";
import { getPendingUserIdsForSeason } from "@/domains/economy-season/repository/season.repository.js";
import { supabase } from "@/infra/supabase/client.js";

const logger = createLogger("economy-season:service:seasonal-decay");

export async function runDecayForSeason(seasonId: string): Promise<{ processed: number; failed: number }> {
  const userIds = await getPendingUserIdsForSeason(seasonId);
  let processed = 0;
  let failed = 0;

  for (const userId of userIds) {
    try {
      const { error } = await supabase.rpc("apply_user_seasonal_decay", {
        p_user_id: userId,
        p_season_id: seasonId,
      });
      if (error) {
        logger.warn(error as Error, "Decay failed for user %s", userId);
        failed++;
      } else {
        processed++;
      }
    } catch (err) {
      logger.warn(err as Error, "Decay error for user %s", userId);
      failed++;
    }
  }

  if (userIds.length > 0) {
    logger.info("Season decay completed seasonId=%s processed=%d failed=%d", seasonId, processed, failed);
  }

  return { processed, failed };
}
