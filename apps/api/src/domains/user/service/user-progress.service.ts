import type { ProgressInsights, StreakStatus } from "../types/progress-insights.types.js";
import { getUserStreakData, getUserStreakHistory } from "./user-streak.service.js";

import { REDIS_CACHE_KEYS } from "../../../infra/redis/cache/keys.js";
import { REDIS_CACHE_TTL_SECONDS } from "../../../infra/redis/cache/policy.js";
import { createLogger } from "@repo/logger";
import { getCallDurationsForUserOnLocalDate } from "../../../infra/supabase/repositories/call-history.js";
import { getExpToday } from "../../../infra/redis/cache/exp-today.js";
import { getOrSet } from "../../../infra/redis/cache/index.js";
import { getUserExpDaily } from "../../../infra/supabase/repositories/user-exp-daily.js";
import { getUserLevelData } from "./user-level.service.js";
import { toUserLocalDateString } from "../../../utils/timezone.js";

const logger = createLogger("api:user:progress:service");

const STREAK_REQUIRED_SECONDS = 300;
const RECENT_STREAK_DAYS = 10;
const MAX_STREAK_DAYS_TO_FETCH = 400;

export async function getUserProgressInsights(
  userId: string,
  timezone: string,
): Promise<ProgressInsights | null> {
  if (!userId || typeof userId !== "string" || userId.trim() === "") {
    return null;
  }

  try {
    return await getOrSet(
      REDIS_CACHE_KEYS.userProgress(userId, timezone),
      REDIS_CACHE_TTL_SECONDS.USER_PROGRESS,
      async () => {
        const [levelData, streakData, streakHistory] = await Promise.all([
          getUserLevelData(userId),
          getUserStreakData(userId),
          getUserStreakHistory(userId, { limit: MAX_STREAK_DAYS_TO_FETCH, offset: 0 }),
        ]);

        if (!levelData) {
          return null;
        }

        const todayStr = toUserLocalDateString(new Date(), timezone);

        const todayStreakDay = streakHistory.data.find((day) => day.date === todayStr);

        const todayCallSeconds = todayStreakDay?.totalCallSeconds || 0;
        const todayIsValid = todayStreakDay?.isValid || false;

        const streakRemainingSeconds = Math.max(0, STREAK_REQUIRED_SECONDS - todayCallSeconds);
        const isTodayStreakComplete = todayCallSeconds >= STREAK_REQUIRED_SECONDS;

        const historySet = new Map(streakHistory.data.map((d) => [d.date, d.isValid]));
        const ref = new Date();

        let currentStreak: number;
        if (!todayIsValid) {
          currentStreak = 0;
        } else {
          const yesterdayStr = toUserLocalDateString(new Date(ref.getTime() - 86400000), timezone);
          if (historySet.get(yesterdayStr) !== true) {
            currentStreak = 1;
          } else {
            let count = 2;
            for (let i = 2; i < MAX_STREAK_DAYS_TO_FETCH; i++) {
              const prevDate = toUserLocalDateString(new Date(ref.getTime() - i * 86400000), timezone);
              if (historySet.get(prevDate) !== true) break;
              count++;
            }
            currentStreak = count;
          }
        }

        const recentStreakDays: { date: string; isValid: boolean }[] = [];
        for (let i = 0; i < RECENT_STREAK_DAYS; i++) {
          const d = toUserLocalDateString(new Date(ref.getTime() - i * 86400000), timezone);
          recentStreakDays.push({ date: d, isValid: currentStreak > 0 && i < currentStreak });
        }

        const expInCurrentLevel = levelData.totalExpSeconds;
        const expToNextLevel = levelData.expToNextLevel;
        const expForCurrentLevel = levelData.totalExpSeconds;
        const expNeededForNextLevel = expToNextLevel;
        const totalExpForLevel = expInCurrentLevel + expNeededForNextLevel;
        const progressPercentage =
          totalExpForLevel > 0
            ? Math.min(100, Math.max(0, (expInCurrentLevel / totalExpForLevel) * 100))
            : 100;

        let expEarnedToday = await getExpToday(userId, todayStr);
        if (expEarnedToday <= 0) {
          expEarnedToday = await getUserExpDaily(userId, todayStr);
        }
        if (expEarnedToday <= 0) {
          expEarnedToday = await getCallDurationsForUserOnLocalDate(userId, todayStr, timezone);
        }
        expEarnedToday = Math.min(expEarnedToday, levelData.totalExpSeconds);

        const remainingSecondsToNextLevel = expToNextLevel;

        let streakStatus: StreakStatus = "incomplete";
        if (currentStreak > 0 && isTodayStreakComplete) streakStatus = "active";
        else if (currentStreak > 0 && (streakData?.lastContinuationUsedFreeze ?? false)) streakStatus = "frozen";

        const insights: ProgressInsights = {
          currentLevel: levelData.level,
          expProgress: {
            totalExpSeconds: levelData.totalExpSeconds,
            expToNextLevel: levelData.expToNextLevel,
            progressPercentage,
          },
          expEarnedToday,
          remainingSecondsToNextLevel,
          streakStatus,
          todayCallDuration: {
            totalSeconds: todayCallSeconds,
            isValid: todayIsValid,
          },
          todayCallDurationSeconds: todayCallSeconds,
          streakRequiredSeconds: STREAK_REQUIRED_SECONDS,
          streakRemainingSeconds,
          isTodayStreakComplete,
          streak: {
            currentStreak,
            longestStreak: streakData?.longestStreak || 0,
            remainingSecondsToKeepStreak: streakRemainingSeconds,
            lastValidDate: streakData?.lastValidDate || null,
          },
          todayDate: todayStr,
          recentStreakDays,
        };

        return insights;
      },
    );
  } catch (error) {
    logger.error(
      "Error getting user progress insights: %o",
      error instanceof Error ? error : new Error(String(error)),
    );
    throw error;
  }
}
