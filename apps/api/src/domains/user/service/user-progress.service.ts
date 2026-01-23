import { createLogger } from "@repo/logger/api";
import { getUserLevelData } from "./user-level.service.js";
import { getUserStreakData, getUserStreakHistory } from "./user-streak.service.js";
import type { ProgressInsights } from "../types/progress-insights.types.js";

const logger = createLogger("API:User:Progress:Service");

const STREAK_REQUIRED_SECONDS = 300;

export async function getUserProgressInsights(userId: string): Promise<ProgressInsights | null> {
  if (!userId || typeof userId !== "string" || userId.trim() === "") {
    return null;
  }

  try {
    const [levelData, streakData, streakHistory] = await Promise.all([
      getUserLevelData(userId),
      getUserStreakData(userId),
      getUserStreakHistory(userId, { limit: 1, offset: 0 }),
    ]);

    if (!levelData) {
      return null;
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0] || "";

    const todayStreakDay = streakHistory.data.find((day) => day.date === todayStr);

    const todayCallSeconds = todayStreakDay?.totalCallSeconds || 0;
    const todayIsValid = todayStreakDay?.isValid || false;

    const streakRemainingSeconds = Math.max(0, STREAK_REQUIRED_SECONDS - todayCallSeconds);
    const isTodayStreakComplete = todayCallSeconds >= STREAK_REQUIRED_SECONDS;

    const expInCurrentLevel = levelData.totalExpSeconds;
    const expToNextLevel = levelData.expToNextLevel;
    const expForCurrentLevel = levelData.totalExpSeconds;
    const expNeededForNextLevel = expToNextLevel;
    const totalExpForLevel = expInCurrentLevel + expNeededForNextLevel;
    const progressPercentage =
      totalExpForLevel > 0
        ? Math.min(100, Math.max(0, (expInCurrentLevel / totalExpForLevel) * 100))
        : 100;

    const insights: ProgressInsights = {
      currentLevel: levelData.level,
      expProgress: {
        totalExpSeconds: levelData.totalExpSeconds,
        expToNextLevel: levelData.expToNextLevel,
        progressPercentage,
      },
      todayCallDuration: {
        totalSeconds: todayCallSeconds,
        isValid: todayIsValid,
      },
      todayCallDurationSeconds: todayCallSeconds,
      streakRequiredSeconds: STREAK_REQUIRED_SECONDS,
      streakRemainingSeconds,
      isTodayStreakComplete,
      streak: {
        currentStreak: streakData?.currentStreak || 0,
        longestStreak: streakData?.longestStreak || 0,
        remainingSecondsToKeepStreak: streakRemainingSeconds,
        lastValidDate: streakData?.lastValidDate || null,
      },
    };

    return insights;
  } catch (error) {
    logger.error("Error getting user progress insights: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}
