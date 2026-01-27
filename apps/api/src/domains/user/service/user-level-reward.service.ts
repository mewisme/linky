import {
  getUserLevelRewardIds,
  getUserLevelRewards,
  grantUserLevelRewards,
} from "../../../infra/supabase/repositories/user-level-rewards.js";

import { createLogger } from "@repo/logger";
import { getLevelRewardsUpToLevel as getLevelRewards } from "../../../infra/supabase/repositories/level-rewards.js";

const logger = createLogger("API:User:LevelReward:Service");

export async function grantRewardsForLevel(userId: string, level: number): Promise<void> {
  if (!userId || typeof userId !== "string" || userId.trim() === "") {
    return;
  }

  if (level <= 0) {
    return;
  }

  try {
    const availableRewards = await getLevelRewards(level);
    if (availableRewards.length === 0) {
      return;
    }

    const grantedRewardIds = await getUserLevelRewardIds(userId);
    const rewardIdsToGrant = availableRewards
      .map((reward) => reward.id)
      .filter((id) => !grantedRewardIds.includes(id));

    if (rewardIdsToGrant.length === 0) {
      return;
    }

    await grantUserLevelRewards(userId, rewardIdsToGrant);
    logger.info("Granted %d level rewards to user %s at level %d", rewardIdsToGrant.length, userId, level);
  } catch (error) {
    logger.error("Error granting rewards for level: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function getUserGrantedRewards(userId: string): Promise<Array<{ levelRewardId: string; grantedAt: string }>> {
  if (!userId || typeof userId !== "string" || userId.trim() === "") {
    return [];
  }

  try {
    const userRewards = await getUserLevelRewards(userId);
    return userRewards.map((reward) => ({
      levelRewardId: reward.level_reward_id,
      grantedAt: reward.granted_at,
    }));
  } catch (error) {
    logger.error("Error getting user granted rewards: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}
