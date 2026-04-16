import type { Namespace } from "socket.io";
import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";
import type { AuthenticatedSocket } from "@/socket/auth.js";
import type { MatchedPayload, RoomPingPayload } from "@/domains/video-chat/types/socket-event.types.js";
import { getPublicUserInfo } from "@/infra/supabase/repositories/user-details.js";
import { getUserIdByClerkId } from "@/infra/supabase/repositories/call-history.js";
import type { VideoChatMatchmaking, VideoChatRooms } from "@/domains/video-chat/socket/types.js";
import { sendPeerActionPush } from "@/contexts/peer-action-notification-context.js";
import {
  calculateLevelFromExp,
  computeExpSecondsForCallDuration,
  getTimezoneForUser,
} from "@/domains/user/index.js";
import { getUserProgressInsights } from "@/domains/user/service/user-progress.service.js";
import { persistRoomCallHistory, recordCallHistoryFromRoom } from "@/domains/video-chat/socket/call-history.socket.js";

const logger = createLogger("api:video-chat:matchmaking:socket");
const STREAK_COMPLETED_EVENT = "streak:completed";

const activeIntervals: ReturnType<typeof setInterval>[] = [];

export function clearMatchmakingIntervals(): void {
  for (const id of activeIntervals) {
    clearInterval(id);
  }
  activeIntervals.length = 0;
  logger.info("All matchmaking intervals cleared");
}

export function setupMatchmakingInterval(io: Namespace, matchmaking: VideoChatMatchmaking, rooms: VideoChatRooms): void {
  const cleanupId = setInterval(async () => {
    await matchmaking.cleanupStaleSockets(io);
    await matchmaking.cleanupExpiredEntries(io);
  }, 30 * 1000);
  activeIntervals.push(cleanupId);

  const matchId = setInterval(async () => {
    const queueSize = await matchmaking.getQueueSize();
    if (queueSize >= 2) {
      const matched = await matchmaking.tryMatch(io);
      if (matched && matched.length === 2) {
        const [user1, user2] = matched;

        if (!user1 || !user2) {
          logger.error("Match failed: Invalid user data");
          return;
        }

        const now = Date.now();
        const user1WaitMs = now - user1.joinedAt.getTime();
        const user2WaitMs = now - user2.joinedAt.getTime();
        const avgWaitMs = Math.round((user1WaitMs + user2WaitMs) / 2);

        logger.info(
          "Match KPI: avgWaitMs=%d user1WaitMs=%d user2WaitMs=%d queueSize=%d activeRooms=%d",
          avgWaitMs,
          user1WaitMs,
          user2WaitMs,
          queueSize,
          rooms.getRoomCount(),
        );

        const roomId = rooms.createRoom(user1.socketId, user2.socketId);
        const isUser1Offerer = user1.socketId < user2.socketId;

        const user1Socket = user1.socket as AuthenticatedSocket;
        const user2Socket = user2.socket as AuthenticatedSocket;

        const clerkUserId1 = user1Socket.data.userId;
        const clerkUserId2 = user2Socket.data.userId;

        let user1Info = null;
        let user2Info = null;
        let dbUserId1: string | null = null;
        let dbUserId2: string | null = null;

        if (clerkUserId1) {
          try {
            dbUserId1 = await getUserIdByClerkId(clerkUserId1);
            if (dbUserId1) {
              user1Info = await getPublicUserInfo(dbUserId1);
            }
          } catch (error) {
            logger.error(toLoggableError(error), "Failed to fetch user info");
          }
        }

        if (clerkUserId2) {
          try {
            dbUserId2 = await getUserIdByClerkId(clerkUserId2);
            if (dbUserId2) {
              user2Info = await getPublicUserInfo(dbUserId2);
            }
          } catch (error) {
            logger.error(toLoggableError(error), "Failed to fetch user info");
          }
        }

        const room = rooms.getRoom(roomId);
        if (room && dbUserId1 && dbUserId2) {
          room.user1DbId = dbUserId1;
          room.user2DbId = dbUserId2;
          void Promise.all([
            getTimezoneForUser(dbUserId1),
            getTimezoneForUser(dbUserId2),
          ])
            .then(([timezone1, timezone2]) => {
              room.user1Timezone = timezone1;
              room.user2Timezone = timezone2;
            })
            .catch((error: unknown) => {
              logger.warn(toLoggableError(error), "Failed to preload room timezones");
            });
        }

        user1Socket.emit("matched", {
          roomId,
          peerId: user2.socketId,
          isOfferer: isUser1Offerer,
          peerInfo: user2Info,
          myInfo: user1Info,
        } satisfies MatchedPayload);

        user2Socket.emit("matched", {
          roomId,
          peerId: user1.socketId,
          isOfferer: !isUser1Offerer,
          peerInfo: user1Info,
          myInfo: user2Info,
        } satisfies MatchedPayload);

        if (dbUserId1) {
          sendPeerActionPush({
            userId: dbUserId1,
            peerSocket: user1Socket,
            title: "Match Found!",
            body: "Someone is ready to chat — head back!",
            url: "/call",
          }).catch((err: unknown) => logger.warn(toLoggableError(err), "Push to user1 failed"));
        }

        if (dbUserId2) {
          sendPeerActionPush({
            userId: dbUserId2,
            peerSocket: user2Socket,
            title: "Match Found!",
            body: "Someone is ready to chat — head back!",
            url: "/call",
          }).catch((err: unknown) => logger.warn(toLoggableError(err), "Push to user2 failed"));
        }
      }
    }
  }, 1000);
  activeIntervals.push(matchId);
}

function applyRealtimeCallProjection(
  progress: Awaited<ReturnType<typeof getUserProgressInsights>>,
  unpersistedElapsedSeconds: number,
  projectedExpGain: number,
  minTotalExpSeconds: number,
) {
  if (!progress) {
    return null;
  }

  const projectedTotalExpSeconds = Math.max(
    minTotalExpSeconds,
    progress.expProgress.totalExpSeconds + projectedExpGain,
  );
  const nextLevel = calculateLevelFromExp(projectedTotalExpSeconds);
  const progressDenominator = projectedTotalExpSeconds + nextLevel.expToNextLevel;
  const projectedPercentage =
    progressDenominator > 0
      ? Math.min(100, Math.max(0, (projectedTotalExpSeconds / progressDenominator) * 100))
      : 100;

  return {
    ...progress,
    currentLevel: nextLevel.level,
    expProgress: {
      ...progress.expProgress,
      totalExpSeconds: projectedTotalExpSeconds,
      expToNextLevel: nextLevel.expToNextLevel,
      progressPercentage: projectedPercentage,
    },
    expEarnedToday: (progress.expEarnedToday ?? 0) + projectedExpGain,
    remainingSecondsToNextLevel: nextLevel.expToNextLevel,
    todayCallDurationSeconds: progress.todayCallDurationSeconds + unpersistedElapsedSeconds,
    todayCallDuration: {
      ...progress.todayCallDuration,
      totalSeconds: progress.todayCallDuration.totalSeconds + unpersistedElapsedSeconds,
      isValid: progress.todayCallDuration.totalSeconds + unpersistedElapsedSeconds >= progress.streakRequiredSeconds,
    },
    streakRemainingSeconds: Math.max(0, progress.streakRequiredSeconds - (progress.todayCallDurationSeconds + unpersistedElapsedSeconds)),
    isTodayStreakComplete: progress.todayCallDurationSeconds + unpersistedElapsedSeconds >= progress.streakRequiredSeconds,
    streak: {
      ...progress.streak,
      remainingSecondsToKeepStreak: Math.max(0, progress.streakRequiredSeconds - (progress.todayCallDurationSeconds + unpersistedElapsedSeconds)),
    },
  };
}

export function setupRoomHeartbeat(io: Namespace, rooms: VideoChatRooms): void {
  const heartbeatId = setInterval(async () => {
    const roomCount = rooms.getRoomCount();
    if (roomCount === 0) {
      return;
    }

    const allRooms = rooms.getAllRooms();

    for (const room of allRooms) {
      try {
        const user1Socket = io.sockets.get(room.user1) as AuthenticatedSocket | undefined;
        const user2Socket = io.sockets.get(room.user2) as AuthenticatedSocket | undefined;

        const payload = {
          timestamp: Date.now(),
          roomId: room.id,
        } satisfies RoomPingPayload;

        const user1Connected = user1Socket?.connected ?? false;
        const user2Connected = user2Socket?.connected ?? false;

        if (user1Connected) {
          user1Socket!.emit("room-ping", payload);
        }

        if (user2Connected) {
          user2Socket!.emit("room-ping", payload);
        }

        if (room.user1DbId && room.user2DbId) {
          if (!room.user1Timezone || !room.user2Timezone) {
            const [timezone1, timezone2] = await Promise.all([
              getTimezoneForUser(room.user1DbId),
              getTimezoneForUser(room.user2DbId),
            ]);
            room.user1Timezone = timezone1;
            room.user2Timezone = timezone2;
          }

          const elapsedSeconds = Math.max(0, Math.floor((Date.now() - room.startedAt.getTime()) / 1000));

          const [user1Progress, user2Progress] = await Promise.all([
            getUserProgressInsights(room.user1DbId, room.user1Timezone),
            getUserProgressInsights(room.user2DbId, room.user2Timezone),
          ]);

          const unpersistedElapsedSeconds = elapsedSeconds;
          const [user1ProjectedGain, user2ProjectedGain] = await Promise.all([
            computeExpSecondsForCallDuration(room.user1DbId, unpersistedElapsedSeconds),
            computeExpSecondsForCallDuration(room.user2DbId, unpersistedElapsedSeconds),
          ]);

          const user1Projected = applyRealtimeCallProjection(
            user1Progress,
            unpersistedElapsedSeconds,
            user1ProjectedGain,
            room.lastProjectedTotalExpUser1 ?? 0,
          );
          const user2Projected = applyRealtimeCallProjection(
            user2Progress,
            unpersistedElapsedSeconds,
            user2ProjectedGain,
            room.lastProjectedTotalExpUser2 ?? 0,
          );

          if (user1Connected && user1Projected) {
            if (
              !room.hasEmittedStreakCompletedUser1 &&
              !user1Progress?.isTodayStreakComplete &&
              user1Projected.isTodayStreakComplete
            ) {
              const payload = {
                eventKey: `${room.id}:${room.user1DbId}:${user1Projected.todayDate}:heartbeat`,
                completedUserId: room.user1DbId,
                userId: room.user1DbId,
                streakCount: (user1Progress?.streak.currentStreak ?? 0) + 1,
                date: user1Projected.todayDate,
              };
              if (user1Connected) {
                user1Socket!.emit(STREAK_COMPLETED_EVENT, payload);
              }
              if (user2Connected) {
                user2Socket!.emit(STREAK_COMPLETED_EVENT, payload);
              }
              room.hasEmittedStreakCompletedUser1 = true;
            }
            room.lastProjectedTotalExpUser1 = user1Projected.expProgress.totalExpSeconds;
            user1Socket!.emit("user:progress:update", user1Projected);
          }

          if (user2Connected && user2Projected) {
            if (
              !room.hasEmittedStreakCompletedUser2 &&
              !user2Progress?.isTodayStreakComplete &&
              user2Projected.isTodayStreakComplete
            ) {
              const payload = {
                eventKey: `${room.id}:${room.user2DbId}:${user2Projected.todayDate}:heartbeat`,
                completedUserId: room.user2DbId,
                userId: room.user2DbId,
                streakCount: (user2Progress?.streak.currentStreak ?? 0) + 1,
                date: user2Projected.todayDate,
              };
              if (user2Connected) {
                user2Socket!.emit(STREAK_COMPLETED_EVENT, payload);
              }
              if (user1Connected) {
                user1Socket!.emit(STREAK_COMPLETED_EVENT, payload);
              }
              room.hasEmittedStreakCompletedUser2 = true;
            }
            room.lastProjectedTotalExpUser2 = user2Projected.expProgress.totalExpSeconds;
            user2Socket!.emit("user:progress:update", user2Projected);
          }
        }

        if (!user1Connected && !user2Connected) {
          logger.info("Both sockets disconnected in room %s - cleaning up", room.id);
          await recordCallHistoryFromRoom(io, room);
          rooms.deleteRoom(room.id);
        }
      } catch (error: unknown) {
        logger.warn(toLoggableError(error), "Room heartbeat iteration failed for room=%s", room.id);
      }
    }
  }, 5000);
  activeIntervals.push(heartbeatId);
}

export async function persistActiveRoomCallHistories(io: Namespace, rooms: VideoChatRooms): Promise<void> {
  const activeRooms = rooms.getAllRooms();
  if (activeRooms.length === 0) {
    return;
  }

  logger.info("Persisting active room call histories before shutdown: rooms=%d", activeRooms.length);

  const results = await Promise.allSettled(
    activeRooms.map(async (room) => {
      await persistRoomCallHistory(io, room);
      rooms.deleteRoom(room.id);
    }),
  );

  const failed = results.filter((result) => result.status === "rejected").length;
  if (failed > 0) {
    logger.warn("Failed persisting some room call histories during shutdown: failed=%d total=%d", failed, activeRooms.length);
    return;
  }

  logger.info("Persisted all active room call histories during shutdown: total=%d", activeRooms.length);
}

