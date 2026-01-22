import { createCallHistory, getUserCountry } from "../../../infra/supabase/repositories/call-history.js";
import { addCallExp } from "../../user/service/user-level.service.js";
import { addCallDurationToStreak } from "../../user/service/user-streak.service.js";

export type OnStreakCompleted = (userId: string, payload: { streakCount: number; date: string }) => void;

export async function recordCallHistoryInDatabase(params: {
  callerId: string;
  calleeId: string;
  startedAt: Date;
  endedAt: Date;
  durationSeconds: number;
  onStreakCompleted?: OnStreakCompleted;
}): Promise<void> {
  const { callerId, calleeId, startedAt, endedAt, durationSeconds, onStreakCompleted } = params;

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
    addCallExp(callerId, durationSeconds),
    addCallExp(calleeId, durationSeconds),
  ]);

  const [callerResult, calleeResult] = await Promise.all([
    addCallDurationToStreak(callerId, durationSeconds, endedAt),
    addCallDurationToStreak(calleeId, durationSeconds, endedAt),
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

