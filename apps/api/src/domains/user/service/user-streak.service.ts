import { createLogger } from "@repo/logger/api";
import {
  upsertUserStreakDay,
  getUserStreak,
  getUserStreakDays,
  getUserStreakDaysByMonth,
} from "../../../infra/supabase/repositories/user-streaks.js";
import type { UserStreak, UserStreakDay } from "../types/user-streak.types.js";
import { getOrSet, invalidate } from "../../../infra/redis/cache/index.js";
import { REDIS_CACHE_KEYS } from "../../../infra/redis/cache/keys.js";
import { REDIS_CACHE_TTL_SECONDS } from "../../../infra/redis/cache/policy.js";

const logger = createLogger("API:User:Streak:Service");

export interface StreakCompletionResult {
  firstTimeValid: boolean;
  streakCount: number;
  date: string;
}

export async function addCallDurationToStreak(
  userId: string,
  durationSeconds: number,
  callEndDate: Date,
): Promise<StreakCompletionResult | null> {
  if (durationSeconds <= 0) {
    return null;
  }

  if (!userId || typeof userId !== "string" || userId.trim() === "") {
    return null;
  }

  try {
    const utcDate = new Date(
      Date.UTC(callEndDate.getUTCFullYear(), callEndDate.getUTCMonth(), callEndDate.getUTCDate()),
    );
    const dateStr = utcDate.toISOString().split("T")[0] ?? "";

    const result = await upsertUserStreakDay(userId, utcDate, durationSeconds);
    logger.info("Added %d seconds to streak for user: %s on date: %s", durationSeconds, userId, dateStr);

    await invalidate(REDIS_CACHE_KEYS.userProgress(userId));

    const current = new Date();
    const currentYear = current.getUTCFullYear();
    const currentMonth = current.getUTCMonth() + 1;
    const updatedYear = utcDate.getUTCFullYear();
    const updatedMonth = utcDate.getUTCMonth() + 1;

    if (updatedYear === currentYear && updatedMonth === currentMonth) {
      await invalidate(REDIS_CACHE_KEYS.userStreakCalendar(userId, updatedYear, updatedMonth));
    }

    if (!result?.firstTimeValid) {
      return null;
    }

    return {
      firstTimeValid: true,
      streakCount: result.currentStreak,
      date: dateStr,
    };
  } catch (error) {
    logger.error("Error adding call duration to streak: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function getUserStreakData(userId: string): Promise<UserStreak | null> {
  if (!userId || typeof userId !== "string" || userId.trim() === "") {
    return null;
  }

  try {
    const record = await getUserStreak(userId);
    if (!record) {
      return null;
    }

    return {
      userId: record.user_id,
      currentStreak: record.current_streak,
      longestStreak: record.longest_streak,
      lastValidDate: record.last_valid_date,
      updatedAt: record.updated_at,
    };
  } catch (error) {
    logger.error("Error getting user streak data: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function getUserStreakHistory(
  userId: string,
  options: { limit?: number; offset?: number } = {},
): Promise<{ data: UserStreakDay[]; count: number | null }> {
  if (!userId || typeof userId !== "string" || userId.trim() === "") {
    return { data: [], count: 0 };
  }

  try {
    const result = await getUserStreakDays(userId, options);
    return {
      data: result.data.map((record) => ({
        id: record.id,
        userId: record.user_id,
        date: record.date,
        totalCallSeconds: record.total_call_seconds,
        isValid: record.is_valid,
        createdAt: record.created_at,
      })),
      count: result.count,
    };
  } catch (error) {
    logger.error("Error getting user streak history: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export interface StreakCalendarDay {
  date: string;
  isValid: boolean;
  totalCallSeconds: number;
  isToday: boolean;
}

export async function getUserStreakCalendar(
  userId: string,
  year: number,
  month: number,
): Promise<StreakCalendarDay[]> {
  if (!userId || typeof userId !== "string" || userId.trim() === "") {
    return [];
  }

  if (month < 1 || month > 12) {
    throw new Error("Month must be between 1 and 12");
  }

  try {
    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth() + 1;

    const ttlSeconds =
      year === currentYear && month === currentMonth
        ? REDIS_CACHE_TTL_SECONDS.USER_STREAK_CALENDAR_CURRENT_MONTH
        : REDIS_CACHE_TTL_SECONDS.USER_STREAK_CALENDAR_PAST_MONTH;

    return await getOrSet(
      REDIS_CACHE_KEYS.userStreakCalendar(userId, year, month),
      ttlSeconds,
      async () => {
        const records = await getUserStreakDaysByMonth(userId, year, month);

        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split("T")[0] || "";

        return records.map((record) => ({
          date: record.date,
          isValid: record.is_valid,
          totalCallSeconds: record.total_call_seconds,
          isToday: record.date === todayStr,
        }));
      },
    );
  } catch (error) {
    logger.error("Error getting user streak calendar: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}
