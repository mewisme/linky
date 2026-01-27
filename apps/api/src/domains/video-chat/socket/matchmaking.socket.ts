import type { Namespace } from "socket.io";
import { createLogger } from "@repo/logger";
import type { AuthenticatedSocket } from "../../../socket/auth.js";
import type { MatchedPayload, RoomPingPayload } from "../types/socket-event.types.js";
import { getPublicUserInfo } from "../../../infra/supabase/repositories/user-details.js";
import { getUserIdByClerkId } from "../../../infra/supabase/repositories/call-history.js";
import type { VideoChatMatchmaking, VideoChatRooms } from "./types.js";

const logger = createLogger("API:VideoChat:Matchmaking:Socket");

export function setupMatchmakingInterval(io: Namespace, matchmaking: VideoChatMatchmaking, rooms: VideoChatRooms): void {
  setInterval(async () => {
    await matchmaking.cleanupExpiredEntries(io);
  }, 30 * 1000);

  setInterval(async () => {
    const queueSize = await matchmaking.getQueueSize();
    if (queueSize >= 2) {
      logger.info("[MATCHER] Matching users (queue: %d)...", queueSize);
      const matched = await matchmaking.tryMatch(io);
      if (matched && matched.length === 2) {
        const [user1, user2] = matched;

        if (!user1 || !user2) {
          logger.error("[MATCHER] Match failed: Invalid user data");
          return;
        }

        logger.info("[MATCHER] Match successful, creating room for: %s <-> %s", user1.socketId, user2.socketId);

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
            logger.error("[MATCHER] Failed to fetch user1 info: %o", error instanceof Error ? error : new Error(String(error)));
          }
        }

        if (clerkUserId2) {
          try {
            const dbUserId2 = await getUserIdByClerkId(clerkUserId2);
            if (dbUserId2) {
              user2Info = await getPublicUserInfo(dbUserId2);
            }
          } catch (error) {
            logger.error("[MATCHER] Failed to fetch user2 info: %o", error instanceof Error ? error : new Error(String(error)));
          }
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

        logger.info(
          "[MATCHER] Users matched and notified: %s and %s (Active rooms: %d, Remaining queue: %d)",
          user1.socketId,
          user2.socketId,
          rooms.getRoomCount(),
          await matchmaking.getQueueSize(),
        );
      } else {
        logger.info("[MATCHER] No match found (queue: %d)", queueSize);
      }
    }
  }, 1000);
}

export function setupRoomHeartbeat(io: Namespace, rooms: VideoChatRooms): void {
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
      } satisfies RoomPingPayload;

      let roomHeartbeatFailed = 0;

      if (user1Socket && user1Socket.connected) {
        try {
          logger.info("[DEBUG] Emitting room-ping: roomId=%s socketId=%s namespace=%s timestamp=%d", room.id, user1Socket.id, user1Socket.nsp.name, payload.timestamp);
          user1Socket.emit("room-ping", payload);
          heartbeatSent++;
        } catch (err) {
          logger.warn("Failed to send heartbeat to user1: %s %o", room.user1, err instanceof Error ? err : new Error(String(err)));
          heartbeatFailed++;
          roomHeartbeatFailed++;
        }
      } else {
        heartbeatFailed++;
        roomHeartbeatFailed++;
      }

      if (user2Socket && user2Socket.connected) {
        try {
          logger.info("[DEBUG] Emitting room-ping: roomId=%s socketId=%s namespace=%s timestamp=%d", room.id, user2Socket.id, user2Socket.nsp.name, payload.timestamp);
          user2Socket.emit("room-ping", payload);
          heartbeatSent++;
        } catch (err) {
          logger.warn("Failed to send heartbeat to user2: %s %o", room.user2, err instanceof Error ? err : new Error(String(err)));
          heartbeatFailed++;
          roomHeartbeatFailed++;
        }
      } else {
        heartbeatFailed++;
        roomHeartbeatFailed++;
      }

      if (roomHeartbeatFailed === 2) {
        logger.warn("Both sockets disconnected in room: %s - cleaning up", room.id);
        rooms.deleteRoom(room.id);
      }
    }

    if (heartbeatSent > 0) {
      logger.info(`Sent %d heartbeats to %d rooms`, heartbeatSent, roomCount);
    }
  }, 4000);
}

