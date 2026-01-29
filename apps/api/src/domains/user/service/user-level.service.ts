import type { LevelCalculationParams, UserLevel } from "../types/user-level.types.js";
import { getUserLevel, incrementUserExp } from "../../../infra/supabase/repositories/user-levels.js";
import { invalidate, invalidateByPrefix } from "../../../infra/redis/cache/index.js";

import { REDIS_CACHE_KEYS } from "../../../infra/redis/cache/keys.js";
import { calculateLevelFromExp as calcLevel } from "../../../logic/level-from-exp.js";
import { checkFavoriteExists } from "../../../infra/supabase/repositories/favorites.js";
import { createLogger } from "@repo/logger";
import { getActiveFavoriteExpBoostRules } from "../../../infra/supabase/repositories/favorite-exp-boost-rules.js";
import { getStreakExpBonusForStreak } from "../../../infra/supabase/repositories/streak-exp-bonuses.js";
import { getUserStreak } from "../../../infra/supabase/repositories/user-streaks.js";
import { grantFreezesForLevel } from "./user-streak-freeze.service.js";
import { grantRewardsForLevel } from "./user-level-reward.service.js";
import { incrExpToday } from "../../../infra/redis/cache/exp-today.js";
import { incrementUserExpDaily } from "../../../infra/supabase/repositories/user-exp-daily.js";

const logger = createLogger("API:User:Level:Service");

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
        logger.info(
          "Applied streak bonus %d for streak %d: %d -> %d EXP for user: %s",
          bonus.bonus_multiplier,
          streakData.current_streak,
          durationSeconds,
          expToAdd,
          userId,
        );
      }
    }

    const counterpartUserId = options?.counterpartUserId;
    if (counterpartUserId) {
      const [aFavB, bFavA] = await Promise.all([
        checkFavoriteExists(userId, counterpartUserId),
        checkFavoriteExists(counterpartUserId, userId),
      ]);
      const rules = await getActiveFavoriteExpBoostRules();
      if (rules) {
        const mult = aFavB && bFavA ? rules.mutual_multiplier : aFavB || bFavA ? rules.one_way_multiplier : 1;
        if (mult > 1) {
          expToAdd = Math.floor(expToAdd * mult);
          logger.info(
            "Applied favorite EXP boost %d (mutual=%s) for user: %s",
            mult,
            Boolean(aFavB && bFavA),
            userId,
          );
        }
      }
    }

    await incrementUserExp(userId, expToAdd);
    const dateForExpToday = options?.dateForExpToday;
    if (dateForExpToday) {
      await Promise.all([
        incrementUserExpDaily(userId, dateForExpToday, expToAdd),
        incrExpToday(userId, dateForExpToday, expToAdd),
      ]);
    }
    if (timezone) {
      await invalidate(REDIS_CACHE_KEYS.userProgress(userId, timezone));
    } else {
      await invalidateByPrefix(`user:progress:${userId}:`);
    }

    const levelAfter = await getUserLevel(userId);
    const levelAfterValue = levelAfter
      ? calculateLevelFromExp(levelAfter.total_exp_seconds, DEFAULT_LEVEL_PARAMS).level
      : 1;

    if (levelAfterValue > levelBeforeValue) {
      await grantRewardsForLevel(userId, levelAfterValue);
      await grantFreezesForLevel(userId, levelAfterValue);
      logger.info("User %s leveled up from %d to %d", userId, levelBeforeValue, levelAfterValue);
    }

    logger.info("Added %d seconds of EXP (base: %d) for user: %s", expToAdd, durationSeconds, userId);
  } catch (error) {
    logger.error("Error adding call exp: %o", error instanceof Error ? error : new Error(String(error)));
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
    logger.error("Error getting user level data: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}
