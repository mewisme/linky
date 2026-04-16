import type { AuthenticatedSocket } from "@/socket/auth.js";
import type { Namespace } from "socket.io";
import type { VideoChatRoomRecord } from "@/domains/video-chat/types/room.types.js";
import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";
import { getTimezoneForUser } from "@/domains/user/index.js";
import { getUserIdByClerkId } from "@/infra/supabase/repositories/call-history.js";
import { recordCallHistoryInDatabase } from "@/domains/video-chat/service/call-history.service.js";
import { applyCallEndedProgress } from "@/contexts/call-ended-context.js";
import { getUserProgressInsights } from "@/domains/user/service/user-progress.service.js";
import { redisClient } from "@/infra/redis/client.js";
import { withRedisTimeout } from "@/infra/redis/timeout-wrapper.js";

const logger = createLogger("api:video-chat:call-history:socket");

const STREAK_COMPLETED_EVENT = "streak:completed";
const IDEMPOTENCY_KEY_TTL_SECONDS = 300;

function getCallIdempotencyKey(userId1: string, userId2: string, startedAt: Date): string {
  const sortedUserIds = [userId1, userId2].sort().join(":");
  const startTime = startedAt.getTime();
  return `call:processed:${sortedUserIds}:${startTime}`;
}

async function acquireIdempotencyLock(key: string): Promise<boolean> {
  try {
    if (!redisClient.isOpen) {
      logger.warn("Redis not available, skipping idempotency check");
      return true;
    }

    const result = await withRedisTimeout(
      () => redisClient.set(key, "1", { NX: true, EX: IDEMPOTENCY_KEY_TTL_SECONDS }),
      `idempotency-lock:${key}`,
    );

    return result === "OK";
  } catch (error: unknown) {
    logger.warn(toLoggableError(error), "Failed to acquire idempotency lock for key %s", key);
    return true;
  }
}

export async function recordCallHistory(
  io: Namespace,
  room: VideoChatRoomRecord,
  socket1: AuthenticatedSocket,
  socket2: AuthenticatedSocket | undefined,
): Promise<void> {
  try {
    const clerkUserId1 = socket1.data.userId;
    if (!clerkUserId1) {
      logger.warn("Cannot record call history: User 1 has no Clerk user ID");
      return;
    }

    const dbUserId1 = await getUserIdByClerkId(clerkUserId1);
    if (!dbUserId1) {
      logger.warn("Cannot record call history: User 1 not found in database");
      return;
    }

    let dbUserId2: string | null = null;
    let calleeSocket: AuthenticatedSocket | undefined = socket2;
    if (socket2?.data.userId) {
      dbUserId2 = await getUserIdByClerkId(socket2.data.userId);
    }

    if (!dbUserId2) {
      const isSocket1User1 = room.user1 === socket1.id;
      const otherSocketId = isSocket1User1 ? room.user2 : room.user1;
      const otherSocket = io.sockets.get(otherSocketId) as AuthenticatedSocket | undefined;

      if (otherSocket?.data.userId) {
        dbUserId2 = await getUserIdByClerkId(otherSocket.data.userId);
        calleeSocket = otherSocket;
      }
    }

    if (!dbUserId2) {
      logger.warn("Cannot record call history: User 2 not found in database");
      return;
    }

    const idempotencyKey = getCallIdempotencyKey(dbUserId1, dbUserId2, room.startedAt);
    const lockAcquired = await acquireIdempotencyLock(idempotencyKey);

    if (!lockAcquired) {
      return;
    }

    const callerId = dbUserId1;
    const calleeId = dbUserId2;
    const callerSocket = socket1;

    const endedAt = new Date();
    const durationSeconds = Math.floor((endedAt.getTime() - room.startedAt.getTime()) / 1000);

    const [callerTimezone, calleeTimezone] = await Promise.all([
      getTimezoneForUser(callerId),
      getTimezoneForUser(calleeId),
    ]);

    const safeDuration = durationSeconds > 0 ? durationSeconds : 0;

    await recordCallHistoryInDatabase({
      callerId,
      calleeId,
      startedAt: room.startedAt,
      endedAt,
      durationSeconds: safeDuration,
      callerTimezone,
      calleeTimezone,
    });

    if (safeDuration > 0) {
      await applyCallEndedProgress({
        callerId,
        calleeId,
        endedAt,
        durationSeconds: safeDuration,
        callerTimezone,
        calleeTimezone,
        onStreakCompleted(userId, payload) {
          if (userId === callerId && room.hasEmittedStreakCompletedUser1) {
            return;
          }
          if (userId === calleeId && room.hasEmittedStreakCompletedUser2) {
            return;
          }
          const targetSocket = userId === callerId ? callerSocket : userId === calleeId ? calleeSocket : undefined;
          if (!targetSocket?.connected && !callerSocket.connected && !calleeSocket?.connected) {
            return;
          }
          if (userId === callerId) {
            room.hasEmittedStreakCompletedUser1 = true;
          } else if (userId === calleeId) {
            room.hasEmittedStreakCompletedUser2 = true;
          }
          const eventPayload = {
            userId,
            streakCount: payload.streakCount,
            date: payload.date,
          };
          if (callerSocket.connected) {
            callerSocket.emit(STREAK_COMPLETED_EVENT, eventPayload);
          }
          if (calleeSocket?.connected) {
            calleeSocket.emit(STREAK_COMPLETED_EVENT, eventPayload);
          }
        },
      });
    }

    const [callerProgress, calleeProgress] = await Promise.all([
      getUserProgressInsights(callerId, callerTimezone),
      getUserProgressInsights(calleeId, calleeTimezone),
    ]);

    if (callerSocket.connected && callerProgress) {
      callerSocket.emit("user:progress:update", callerProgress);
    }
    if (calleeSocket?.connected && calleeProgress) {
      calleeSocket.emit("user:progress:update", calleeProgress);
    }

    logger.info("Call history recorded: duration=%ds", durationSeconds);
  } catch (error) {
    logger.error(toLoggableError(error), "Error recording call history");
  }
}

export async function recordCallHistoryFromRoom(
  io: Namespace,
  room: VideoChatRoomRecord,
): Promise<void> {
  const callerDbId = room.user1DbId;
  const calleeDbId = room.user2DbId;
  if (!callerDbId || !calleeDbId) {
    logger.warn("Cannot record call history from room: missing user1DbId or user2DbId");
    return;
  }

  try {
    const idempotencyKey = getCallIdempotencyKey(callerDbId, calleeDbId, room.startedAt);
    const lockAcquired = await acquireIdempotencyLock(idempotencyKey);
    if (!lockAcquired) {
      return;
    }

    const endedAt = new Date();
    const durationSeconds = Math.floor((endedAt.getTime() - room.startedAt.getTime()) / 1000);
    const safeDuration = durationSeconds > 0 ? durationSeconds : 0;

    const [callerTimezone, calleeTimezone] = await Promise.all([
      getTimezoneForUser(callerDbId),
      getTimezoneForUser(calleeDbId),
    ]);

    await recordCallHistoryInDatabase({
      callerId: callerDbId,
      calleeId: calleeDbId,
      startedAt: room.startedAt,
      endedAt,
      durationSeconds: safeDuration,
      callerTimezone,
      calleeTimezone,
    });

    if (safeDuration > 0) {
      await applyCallEndedProgress({
        callerId: callerDbId,
        calleeId: calleeDbId,
        endedAt,
        durationSeconds: safeDuration,
        callerTimezone,
        calleeTimezone,
      });
    }

    logger.info("Call history recorded from room (no sockets): duration=%ds", safeDuration);
  } catch (error) {
    logger.error(toLoggableError(error), "Error recording call history from room");
  }
}

export async function persistRoomCallHistory(
  io: Namespace,
  room: VideoChatRoomRecord,
): Promise<void> {
  if (room.user1DbId && room.user2DbId) {
    await recordCallHistoryFromRoom(io, room);
    return;
  }

  const socket1 = io.sockets.get(room.user1) as AuthenticatedSocket | undefined;
  if (!socket1) {
    logger.warn("Cannot persist room call history: user1 socket not found room=%s", room.id);
    return;
  }

  const socket2 = io.sockets.get(room.user2) as AuthenticatedSocket | undefined;
  await recordCallHistory(io, room, socket1, socket2);
}

