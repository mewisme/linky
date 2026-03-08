import type { AuthenticatedSocket } from "@/socket/auth.js";
import type { Namespace } from "socket.io";
import type { VideoChatRoom, VideoChatRoomRecord } from "@/domains/video-chat/types/room.types.js";
import { createLogger } from "@/utils/logger.js";
import { getTimezoneForUser } from "@/domains/user/service/user-details.service.js";
import { getUserIdByClerkId } from "@/infra/supabase/repositories/call-history.js";
import { recordCallHistoryInDatabase } from "@/domains/video-chat/service/call-history.service.js";
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
  } catch (error) {
    logger.warn(
      error as Error,
      "Failed to acquire idempotency lock for key %s",
      key,
    );
    return true;
  }
}

export async function recordCallHistory(
  io: Namespace,
  room: VideoChatRoom,
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

    await recordCallHistoryInDatabase({
      callerId,
      calleeId,
      startedAt: room.startedAt,
      endedAt,
      durationSeconds: durationSeconds > 0 ? durationSeconds : 0,
      callerTimezone,
      calleeTimezone,
      onStreakCompleted(userId, payload) {
        const socket = userId === callerId ? callerSocket : userId === calleeId ? calleeSocket : undefined;
        if (!socket?.connected) {
          return;
        }
        socket.emit(STREAK_COMPLETED_EVENT, {
          userId,
          streakCount: payload.streakCount,
          date: payload.date,
        });
      },
    });

    logger.info("Call history recorded: duration=%ds", durationSeconds);
  } catch (error) {
    logger.error(error as Error, "Error recording call history");
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

    logger.info("Call history recorded from room (no sockets): duration=%ds", safeDuration);
  } catch (error) {
    logger.error(error as Error, "Error recording call history from room");
  }
}

