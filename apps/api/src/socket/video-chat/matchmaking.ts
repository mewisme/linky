import type { Namespace } from "socket.io";
import { RedisMatchmakingService } from "../../services/redis-matchmaking.js";
import { RoomService } from "../../services/rooms.js";
import { Logger } from "../../utils/logger.js";
import { type AuthenticatedSocket } from "../auth.js";

const logger = new Logger("MatchmakingInterval");
import { getPublicUserInfo } from "../../lib/supabase/queries/user-details.js";
import { getUserIdByClerkId } from "../../lib/supabase/queries/call-history.js";

export function setupMatchmakingInterval(
  io: Namespace,
  matchmaking: RedisMatchmakingService,
  rooms: RoomService
): void {
  setInterval(async () => {
    await matchmaking.cleanupExpiredEntries(io);
  }, 30 * 1000);

  setInterval(async () => {
    const queueSize = await matchmaking.getQueueSize();
    if (queueSize >= 2) {
      logger.load(`Matching users (queue: ${queueSize})...`);
      const matched = await matchmaking.tryMatch(io);
      if (matched && matched.length === 2) {
        const [user1, user2] = matched;

        if (!user1 || !user2) {
          logger.error("Match failed: Invalid user data");
          return;
        }

        const roomId = rooms.createRoom(user1.socketId, user2.socketId);
        const isUser1Offerer = user1.socketId < user2.socketId;

        const user1Socket = user1.socket as AuthenticatedSocket;
        const user2Socket = user2.socket as AuthenticatedSocket;

        const clerkUserId1 = user1Socket.data.userId;
        const clerkUserId2 = user2Socket.data.userId;

        let user1Info = null;
        let user2Info = null;

        if (clerkUserId1) {
          try {
            const dbUserId1 = await getUserIdByClerkId(clerkUserId1);
            if (dbUserId1) {
              user1Info = await getPublicUserInfo(dbUserId1);
            }
          } catch (error) {
            logger.error("Failed to fetch user1 info:", error instanceof Error ? error.message : "Unknown error");
          }
        }

        if (clerkUserId2) {
          try {
            const dbUserId2 = await getUserIdByClerkId(clerkUserId2);
            if (dbUserId2) {
              user2Info = await getPublicUserInfo(dbUserId2);
            }
          } catch (error) {
            logger.error("Failed to fetch user2 info:", error instanceof Error ? error.message : "Unknown error");
          }
        }

        user1Socket.emit("matched", {
          roomId,
          peerId: user2.socketId,
          isOfferer: isUser1Offerer,
          peerInfo: user2Info,
          myInfo: user1Info,
        });

        user2Socket.emit("matched", {
          roomId,
          peerId: user1.socketId,
          isOfferer: !isUser1Offerer,
          peerInfo: user1Info,
          myInfo: user2Info,
        });

        logger.done("Users matched:", user1.socketId, "and", user2.socketId, `(Active rooms: ${rooms.getRoomCount()}, Remaining queue: ${matchmaking.getQueueSize()})`);
      }
    }
  }, 1000);
}

export function setupRoomHeartbeat(
  io: Namespace,
  rooms: RoomService
): void {
  setInterval(() => {
    const roomCount = rooms.getRoomCount();
    if (roomCount === 0) {
      return;
    }

    const allRooms = rooms.getAllRooms();
    let heartbeatSent = 0;
    let heartbeatFailed = 0;

    for (const room of allRooms) {
      const user1Socket = io.sockets.get(room.user1) as AuthenticatedSocket | undefined;
      const user2Socket = io.sockets.get(room.user2) as AuthenticatedSocket | undefined;

      const payload = {
        timestamp: Date.now(),
        roomId: room.id,
      };

      let roomHeartbeatFailed = 0;

      if (user1Socket && user1Socket.connected) {
        try {
          user1Socket.emit("room-ping", payload);
          heartbeatSent++;
        } catch (err) {
          logger.warn("[RoomHeartbeat] Failed to send heartbeat to user1:", room.user1, err);
          heartbeatFailed++;
          roomHeartbeatFailed++;
        }
      } else {
        heartbeatFailed++;
        roomHeartbeatFailed++;
      }

      if (user2Socket && user2Socket.connected) {
        try {
          user2Socket.emit("room-ping", payload);
          heartbeatSent++;
        } catch (err) {
          logger.warn("[RoomHeartbeat] Failed to send heartbeat to user2:", room.user2, err);
          heartbeatFailed++;
          roomHeartbeatFailed++;
        }
      } else {
        heartbeatFailed++;
        roomHeartbeatFailed++;
      }

      if (roomHeartbeatFailed === 2) {
        logger.warn("[RoomHeartbeat] Both sockets disconnected in room:", room.id, "- cleaning up");
        rooms.deleteRoom(room.id);
      }
    }

    if (heartbeatSent > 0) {
      logger.info(`[RoomHeartbeat] Sent ${heartbeatSent} heartbeats to ${roomCount} rooms`);
    }
  }, 4000);
}