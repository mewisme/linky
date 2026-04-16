import type { LevelCalculationParams, UserLevel } from "@/domains/user/types/user-level.types.js";
import { getUserLevel, incrementUserExp } from "@/infra/supabase/repositories/user-levels.js";
import { calculateLevelFromExp as calcLevel } from "@/logic/level-from-exp.js";
import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";
import { getStreakExpBonusForStreak } from "@/infra/supabase/repositories/streak-exp-bonuses.js";
import { getUserStreak } from "@/infra/supabase/repositories/user-streaks.js";
import { grantFreezesForLevel } from "./user-streak-freeze.service.js";
import { grantRewardsForLevel } from "./user-level-reward.service.js";
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
  expSecondsToAdd?: number;
}

export async function computeExpSecondsForCallDuration(
  userId: string,
  durationSeconds: number,
): Promise<number> {
  if (durationSeconds <= 0) return 0;
  if (!userId || typeof userId !== "string" || userId.trim() === "") return 0;

  let expToAdd = durationSeconds;
  const streakData = await getUserStreak(userId);
  if (streakData && streakData.current_streak > 0) {
    const bonus = await getStreakExpBonusForStreak(streakData.current_streak);
    if (bonus) {
      expToAdd = Math.floor(durationSeconds * bonus.bonus_multiplier);
    }
  }
  return expToAdd;
}

export async function addCallExp(
  userId: string,
  durationSeconds: number,
  options?: AddCallExpOptions,
): Promise<void> {
  if (durationSeconds <= 0) return;
  if (!userId || typeof userId !== "string" || userId.trim() === "") return;

  try {
    const levelBefore = await getUserLevel(userId);
    const levelBeforeValue = levelBefore
      ? calculateLevelFromExp(levelBefore.total_exp_seconds, DEFAULT_LEVEL_PARAMS).level
      : 1;

    let expToAdd: number;
    if (options?.expSecondsToAdd != null) {
      expToAdd = Math.max(0, options.expSecondsToAdd);
    } else {
      expToAdd = await computeExpSecondsForCallDuration(userId, durationSeconds);
    }

    const dateForExpToday = options?.dateForExpToday;
    const totalBefore = levelBefore?.total_exp_seconds ?? 0;
    logger.info(
      "addCallExp start user=%s duration=%d expToAdd=%d totalBefore=%d date=%s",
      userId,
      durationSeconds,
      expToAdd,
      totalBefore,
      dateForExpToday ?? "n/a",
    );
    await incrementUserExp(userId, expToAdd);
    if (dateForExpToday) {
      await incrementDailyExpWithMilestones(userId, dateForExpToday, expToAdd);
    }

    const levelAfter = await getUserLevel(userId);
    const totalAfter = levelAfter?.total_exp_seconds ?? totalBefore;
    logger.info(
      "addCallExp done user=%s expToAdd=%d totalAfter=%d delta=%d",
      userId,
      expToAdd,
      totalAfter,
      totalAfter - totalBefore,
    );
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
