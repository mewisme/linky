import type { ProgressInsights, StreakStatus } from "@/domains/user/types/progress-insights.types.js";
import { getUserStreakData, getUserStreakHistory } from "./user-streak.service.js";

import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";
import { getCallDurationsForUserOnLocalDate } from "@/infra/supabase/repositories/call-history.js";
import { getUserExpDaily } from "@/infra/supabase/repositories/user-exp-daily.js";
import { getUserLevelData } from "./user-level.service.js";
import { addDays } from "@/utils/date-helpers.js";
import { toUserLocalDateString } from "@/utils/timezone.js";

const logger = createLogger("api:user:progress:service");

const STREAK_REQUIRED_SECONDS = 300;
const RECENT_STREAK_DAYS = 7;
const MAX_STREAK_DAYS_TO_FETCH = 400;

function longestConsecutiveValidDays(validDateStrs: string[]): number {
  const dates = [...new Set(validDateStrs)].sort();
  if (dates.length === 0) return 0;
  let maxRun = 1;
  let run = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = dates[i - 1]!;
    const curr = dates[i]!;
    if (addDays(prev, 1) === curr) {
      run++;
      if (run > maxRun) maxRun = run;
    } else {
      run = 1;
    }
  }
  return maxRun;
}

export async function getUserProgressInsights(
  userId: string,
  timezone: string,
): Promise<ProgressInsights | null> {
  if (!userId || typeof userId !== "string" || userId.trim() === "") {
    return null;
  }

  try {
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

    let streakIfTodayCompleted: number;
    if (todayIsValid) {
      streakIfTodayCompleted = currentStreak;
    } else {
      const yesterdayStr = toUserLocalDateString(new Date(ref.getTime() - 86400000), timezone);
      if (historySet.get(yesterdayStr) !== true) {
        streakIfTodayCompleted = 1;
      } else {
        let count = 2;
        for (let i = 2; i < MAX_STREAK_DAYS_TO_FETCH; i++) {
          const prevDate = toUserLocalDateString(new Date(ref.getTime() - i * 86400000), timezone);
          if (historySet.get(prevDate) !== true) break;
          count++;
        }
        streakIfTodayCompleted = count;
      }
    }

    const recentStreakDays: { date: string; isValid: boolean }[] = [];
    for (let i = 0; i < RECENT_STREAK_DAYS; i++) {
      const d = toUserLocalDateString(new Date(ref.getTime() - i * 86400000), timezone);
      recentStreakDays.push({ date: d, isValid: currentStreak > 0 && i < currentStreak });
    }

    const validHistoryDates = streakHistory.data.filter((d) => d.isValid).map((d) => d.date);
    const longestFromHistory = longestConsecutiveValidDays(validHistoryDates);
    const longestStreak = Math.max(
      streakData?.longestStreak ?? 0,
      longestFromHistory,
      currentStreak,
    );

    const expInCurrentLevel = levelData.totalExpSeconds;
    const expToNextLevel = levelData.expToNextLevel;
    const expForCurrentLevel = levelData.totalExpSeconds;
    const expNeededForNextLevel = expToNextLevel;
    const totalExpForLevel = expInCurrentLevel + expNeededForNextLevel;
    const progressPercentage =
      totalExpForLevel > 0
        ? Math.min(100, Math.max(0, (expInCurrentLevel / totalExpForLevel) * 100))
        : 100;

    let expEarnedToday = await getUserExpDaily(userId, todayStr);
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
      streakIfTodayCompleted,
      streak: {
        currentStreak,
        longestStreak,
        remainingSecondsToKeepStreak: streakRemainingSeconds,
        lastValidDate: streakData?.lastValidDate || null,
      },
      todayDate: todayStr,
      recentStreakDays,
    };

    return insights;
  } catch (error) {
    logger.error(toLoggableError(error), "Error getting user progress insights");
    throw error;
  }
}
