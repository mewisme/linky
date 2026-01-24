import { createCallHistory, getUserCountry } from "../../../infra/supabase/repositories/call-history.js";
import { addCallExp } from "../../user/service/user-level.service.js";
import { addCallDurationToStreak } from "../../user/service/user-streak.service.js";
import { invalidate } from "../../../infra/redis/cache/index.js";
import { REDIS_CACHE_KEYS } from "../../../infra/redis/cache/keys.js";

export type OnStreakCompleted = (userId: string, payload: { streakCount: number; date: string }) => void;

export async function recordCallHistoryInDatabase(params: {
  callerId: string;
  calleeId: string;
  startedAt: Date;
  endedAt: Date;
  durationSeconds: number;
  callerTimezone: string;
  calleeTimezone: string;
  onStreakCompleted?: OnStreakCompleted;
}): Promise<void> {
  const {
    callerId,
    calleeId,
    startedAt,
    endedAt,
    durationSeconds,
    callerTimezone,
    calleeTimezone,
    onStreakCompleted,
  } = params;

  const callerCountry = await getUserCountry(callerId);
  const calleeCountry = await getUserCountry(calleeId);

  await createCallHistory({
    callerId,
    calleeId,
    callerCountry,
    calleeCountry,
    startedAt,
    endedAt,
    durationSeconds,
  });

  if (durationSeconds <= 0) {
    return;
  }

  await Promise.allSettled([
    invalidate(REDIS_CACHE_KEYS.userProgress(callerId, callerTimezone)),
    invalidate(REDIS_CACHE_KEYS.userProgress(calleeId, calleeTimezone)),
  ]);

  await Promise.allSettled([
    addCallExp(callerId, durationSeconds, callerTimezone),
    addCallExp(calleeId, durationSeconds, calleeTimezone),
  ]);

  const [callerResult, calleeResult] = await Promise.all([
    addCallDurationToStreak(callerId, durationSeconds, endedAt, callerTimezone),
    addCallDurationToStreak(calleeId, durationSeconds, endedAt, calleeTimezone),
  ]);

  if (onStreakCompleted) {
    if (callerResult?.firstTimeValid) {
      onStreakCompleted(callerId, { streakCount: callerResult.streakCount, date: callerResult.date });
    }
    if (calleeResult?.firstTimeValid) {
      onStreakCompleted(calleeId, { streakCount: calleeResult.streakCount, date: calleeResult.date });
    }
  }
}

