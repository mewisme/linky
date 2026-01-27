import { createCallHistory, getUserCountry } from "../../../infra/supabase/repositories/call-history.js";

import { REDIS_CACHE_KEYS } from "../../../infra/redis/cache/keys.js";
import { addCallDurationToStreak } from "../../user/service/user-streak.service.js";
import { addCallExp } from "../../user/service/user-level.service.js";
import { createLogger } from "@repo/logger";
import { invalidate } from "../../../infra/redis/cache/index.js";

const logger = createLogger("API:VideoChat:CallHistory:Service");

export type OnStreakCompleted = (userId: string, payload: { streakCount: number; date: string }) => void;

interface ApplyCallProgressParams {
  userId: string;
  counterpartUserId: string;
  durationSeconds: number;
  callEndDate: Date;
  timezone: string;
}

interface ApplyCallProgressResult {
  streakResult: Awaited<ReturnType<typeof addCallDurationToStreak>>;
}

async function applyCallProgressForUser(
  params: ApplyCallProgressParams,
): Promise<ApplyCallProgressResult> {
  const { userId, counterpartUserId, durationSeconds, callEndDate, timezone } = params;

  const dateStr = new Date(callEndDate).toLocaleDateString("sv-SE", { timeZone: timezone });

  await Promise.allSettled([
    invalidate(REDIS_CACHE_KEYS.userProgress(userId, timezone)),
    addCallExp(userId, durationSeconds, {
      timezone,
      counterpartUserId,
      dateForExpToday: dateStr,
    }),
  ]);

  const streakResult = await addCallDurationToStreak(userId, durationSeconds, callEndDate, timezone);

  return { streakResult };
}

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

  const [callerProgressResult, calleeProgressResult] = await Promise.allSettled([
    applyCallProgressForUser({
      userId: callerId,
      counterpartUserId: calleeId,
      durationSeconds,
      callEndDate: endedAt,
      timezone: callerTimezone,
    }),
    applyCallProgressForUser({
      userId: calleeId,
      counterpartUserId: callerId,
      durationSeconds,
      callEndDate: endedAt,
      timezone: calleeTimezone,
    }),
  ]);

  if (callerProgressResult.status === "rejected") {
    logger.error(
      "Failed to apply call progress for caller %s: %o",
      callerId,
      callerProgressResult.reason instanceof Error ? callerProgressResult.reason : new Error(String(callerProgressResult.reason)),
    );
  }

  if (calleeProgressResult.status === "rejected") {
    logger.error(
      "Failed to apply call progress for callee %s: %o",
      calleeId,
      calleeProgressResult.reason instanceof Error ? calleeProgressResult.reason : new Error(String(calleeProgressResult.reason)),
    );
  }

  if (onStreakCompleted) {
    if (callerProgressResult.status === "fulfilled" && callerProgressResult.value.streakResult?.firstTimeValid) {
      onStreakCompleted(callerId, {
        streakCount: callerProgressResult.value.streakResult.streakCount,
        date: callerProgressResult.value.streakResult.date,
      });
    }
    if (calleeProgressResult.status === "fulfilled" && calleeProgressResult.value.streakResult?.firstTimeValid) {
      onStreakCompleted(calleeId, {
        streakCount: calleeProgressResult.value.streakResult.streakCount,
        date: calleeProgressResult.value.streakResult.date,
      });
    }
  }
}

