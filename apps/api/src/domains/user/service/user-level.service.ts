import type { LevelCalculationParams, UserLevel } from "../types/user-level.types.js";
import { getUserLevel, incrementUserExp } from "../../../infra/supabase/repositories/user-levels.js";

import { createLogger } from "@repo/logger/api";
import { getStreakExpBonusForStreak } from "../../../infra/supabase/repositories/streak-exp-bonuses.js";
import { getUserStreak } from "../../../infra/supabase/repositories/user-streaks.js";
import { grantRewardsForLevel } from "./user-level-reward.service.js";
import { invalidate } from "../../../infra/redis/cache/index.js";
import { REDIS_CACHE_KEYS } from "../../../infra/redis/cache/keys.js";

const logger = createLogger("API:User:Level:Service");

const DEFAULT_LEVEL_PARAMS: LevelCalculationParams = {
  base: 300,
  step: 120,
};

export function calculateLevelFromExp(
  totalExpSeconds: number,
  params: LevelCalculationParams = DEFAULT_LEVEL_PARAMS,
): { level: number; expToNextLevel: number } {
  const { base, step } = params;

  if (totalExpSeconds <= 0) {
    const expForNextLevel = base;
    return { level: 1, expToNextLevel: expForNextLevel };
  }

  const a = step / 2;
  const b = base - (3 * step) / 2;
  const c = step - base - totalExpSeconds;

  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) {
    const expForNextLevel = base;
    return { level: 1, expToNextLevel: expForNextLevel };
  }

  const sqrtDiscriminant = Math.sqrt(discriminant);
  const levelCandidate = Math.floor((-b + sqrtDiscriminant) / (2 * a)) + 1;

  let level = Math.max(1, levelCandidate);

  let expRequired = 0;
  if (level > 1) {
    const n = level - 1;
    expRequired = n * base + (step * (n - 1) * n) / 2;
  }

  while (expRequired + base + (level - 1) * step <= totalExpSeconds) {
    expRequired += base + (level - 1) * step;
    level++;
  }

  if (level > levelCandidate + 2) {
    level = levelCandidate + 1;
    const n = level - 1;
    expRequired = n * base + (step * (n - 1) * n) / 2;
  }

  const expForNextLevel = base + (level - 1) * step;
  const expInCurrentLevel = totalExpSeconds - expRequired;
  const expToNextLevel = expForNextLevel - expInCurrentLevel;

  return { level, expToNextLevel };
}

export async function addCallExp(userId: string, durationSeconds: number): Promise<void> {
  if (durationSeconds <= 0) {
    return;
  }

  if (!userId || typeof userId !== "string" || userId.trim() === "") {
    return;
  }

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

    await incrementUserExp(userId, expToAdd);
    await invalidate(REDIS_CACHE_KEYS.userProgress(userId));

    const levelAfter = await getUserLevel(userId);
    const levelAfterValue = levelAfter
      ? calculateLevelFromExp(levelAfter.total_exp_seconds, DEFAULT_LEVEL_PARAMS).level
      : 1;

    if (levelAfterValue > levelBeforeValue) {
      await grantRewardsForLevel(userId, levelAfterValue);
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
