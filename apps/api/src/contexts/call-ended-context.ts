import {
  addCallExp,
  addCallDurationToStreak,
  computeExpSecondsForCallDuration,
} from "@/domains/user/index.js";
import { tryEnqueueApplyCallExpJob } from "@/jobs/worker-jobs/apply-call-exp.job.js";
import { toUserLocalDateString } from "@/utils/timezone.js";
import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";

const logger = createLogger("context:call-ended");

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

async function applyCallProgressForUser(params: ApplyCallProgressParams): Promise<ApplyCallProgressResult> {
  const { userId, counterpartUserId, durationSeconds, callEndDate, timezone } = params;

  const dateStr = toUserLocalDateString(new Date(callEndDate), timezone);
  const expSecondsToAdd = await computeExpSecondsForCallDuration(userId, durationSeconds);

  try {
    await addCallExp(userId, durationSeconds, {
      timezone,
      counterpartUserId,
      dateForExpToday: dateStr,
      expSecondsToAdd,
    });
  } catch (error) {
    logger.error(toLoggableError(error), "addCallExp failed user=%s", userId);
    const enqueued = await tryEnqueueApplyCallExpJob({
      userId,
      durationSeconds,
      expSecondsToAdd,
      timezone,
      counterpartUserId,
      dateForExpToday: dateStr,
    });
    if (!enqueued) {
      logger.error("apply_call_exp job not enqueued for user=%s (redis unavailable?)", userId);
    }
  }

  const streakResult = await addCallDurationToStreak(userId, durationSeconds, callEndDate, timezone);

  return { streakResult };
}

export async function applyCallEndedProgress(params: {
  callerId: string;
  calleeId: string;
  endedAt: Date;
  durationSeconds: number;
  callerTimezone: string;
  calleeTimezone: string;
  onStreakCompleted?: OnStreakCompleted;
}): Promise<void> {
  const {
    callerId,
    calleeId,
    endedAt,
    durationSeconds,
    callerTimezone,
    calleeTimezone,
    onStreakCompleted,
  } = params;

  if (durationSeconds <= 0) {
    logger.info("applyCallEndedProgress skip duration<=0 caller=%s callee=%s", callerId, calleeId);
    return;
  }

  logger.info(
    "applyCallEndedProgress start caller=%s callee=%s duration=%d callerTz=%s calleeTz=%s",
    callerId,
    calleeId,
    durationSeconds,
    callerTimezone,
    calleeTimezone,
  );

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
      toLoggableError(callerProgressResult.reason),
      "Failed to apply call progress for caller %s",
      callerId,
    );
  }

  if (calleeProgressResult.status === "rejected") {
    logger.error(
      toLoggableError(calleeProgressResult.reason),
      "Failed to apply call progress for callee %s",
      calleeId,
    );
  }

  logger.info(
    "applyCallEndedProgress done callerStatus=%s calleeStatus=%s duration=%d",
    callerProgressResult.status,
    calleeProgressResult.status,
    durationSeconds,
  );

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
