import type { LevelCalculationParams, UserLevel } from "@/domains/user/types/user-level.types.js";
import { getUserLevel, incrementUserExp } from "@/infra/supabase/repositories/user-levels.js";
import { invalidate, invalidateByPrefix } from "@/infra/redis/cache/index.js";

import { REDIS_CACHE_KEYS } from "@/infra/redis/cache/keys.js";
import { calculateLevelFromExp as calcLevel } from "@/logic/level-from-exp.js";
import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";
import { getStreakExpBonusForStreak } from "@/infra/supabase/repositories/streak-exp-bonuses.js";
import { getUserStreak } from "@/infra/supabase/repositories/user-streaks.js";
import { grantFreezesForLevel } from "./user-streak-freeze.service.js";
import { grantRewardsForLevel } from "./user-level-reward.service.js";
import { incrExpToday } from "@/infra/redis/cache/exp-today.js";
import { incrementDailyExpWithMilestones } from "@/infra/supabase/repositories/user-exp-daily.js";

const logger = createLogger("api:user:level:service");

const DEFAULT_LEVEL_PARAMS: LevelCalculationParams = {
  base: 300,
  step: 120,
};

export function calculateLevelFromExp(
  totalExpSeconds: number,
  params: LevelCalculationParams = DEFAULT_LEVEL_PARAMS
): { level: number; expToNextLevel: number } {
  return calcLevel(totalExpSeconds, params);
}

export interface AddCallExpOptions {
  timezone?: string;
  counterpartUserId?: string;
  dateForExpToday?: string;
}

export async function addCallExp(
  userId: string,
  durationSeconds: number,
  options?: AddCallExpOptions,
): Promise<void> {
  if (durationSeconds <= 0) return;
  if (!userId || typeof userId !== "string" || userId.trim() === "") return;

  const timezone = options?.timezone;

  try {
    const levelBefore = await getUserLevel(userId);
    const levelBeforeValue = levelBefore
      ? calculateLevelFromExp(levelBefore.total_exp_seconds, DEFAULT_LEVEL_PARAMS).level
      : 1;

    let expToAdd = durationSeconds;

    const streakData = await getUserStreak(userId);
    if (streakData && streakData.current_streak > 0) {
      const bonus = await getStreakExpBonusForStreak(streakData.current_streak);
      if (bonus) {
        expToAdd = Math.floor(durationSeconds * bonus.bonus_multiplier);
      }
    }

    const dateForExpToday = options?.dateForExpToday;
    await incrementUserExp(userId, expToAdd);
    if (dateForExpToday) {
      await Promise.all([
        incrementDailyExpWithMilestones(userId, dateForExpToday, expToAdd),
        incrExpToday(userId, dateForExpToday, expToAdd),
      ]);
    }
    await invalidateByPrefix(`user:progress:${userId}:`);
    if (timezone) {
      await invalidate(REDIS_CACHE_KEYS.userProgress(userId, timezone));
    }

    const levelAfter = await getUserLevel(userId);
    const levelAfterValue = levelAfter
      ? calculateLevelFromExp(levelAfter.total_exp_seconds, DEFAULT_LEVEL_PARAMS).level
      : 1;

    if (levelAfterValue > levelBeforeValue) {
      await grantRewardsForLevel(userId, levelAfterValue);
      await grantFreezesForLevel(userId, levelAfterValue);
      logger.info("User leveled up: user=%s from=%d to=%d", userId, levelBeforeValue, levelAfterValue);
    }
  } catch (error) {
    logger.error(toLoggableError(error), "Error adding call exp");
    throw error;
  }
}

export async function getUserLevelData(
  userId: string,
  params: LevelCalculationParams = DEFAULT_LEVEL_PARAMS,
): Promise<UserLevel | null> {
  if (!userId || typeof userId !== "string" || userId.trim() === "") {
    return null;
  }

  try {
    const record = await getUserLevel(userId);
    if (!record) {
      const { level, expToNextLevel } = calculateLevelFromExp(0, params);
      return {
        userId,
        totalExpSeconds: 0,
        level,
        expToNextLevel,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    const { level, expToNextLevel } = calculateLevelFromExp(record.total_exp_seconds, params);

    return {
      userId: record.user_id,
      totalExpSeconds: record.total_exp_seconds,
      level,
      expToNextLevel,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  } catch (error) {
    logger.error(toLoggableError(error), "Error getting user level data");
    throw error;
  }
}
