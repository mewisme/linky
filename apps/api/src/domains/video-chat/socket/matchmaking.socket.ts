import type { Namespace } from "socket.io";
import { createLogger } from "@/utils/logger.js";
import type { AuthenticatedSocket } from "@/socket/auth.js";
import type { MatchedPayload, RoomPingPayload } from "@/domains/video-chat/types/socket-event.types.js";
import { getPublicUserInfo } from "@/infra/supabase/repositories/user-details.js";
import { getUserIdByClerkId } from "@/infra/supabase/repositories/call-history.js";
import type { VideoChatMatchmaking, VideoChatRooms } from "@/domains/video-chat/socket/types.js";
import { sendPeerActionPush } from "@/contexts/peer-action-notification-context.js";

const logger = createLogger("api:video-chat:matchmaking:socket");

export function setupMatchmakingInterval(io: Namespace, matchmaking: VideoChatMatchmaking, rooms: VideoChatRooms): void {
  setInterval(async () => {
    await matchmaking.cleanupStaleSockets(io);
    await matchmaking.cleanupExpiredEntries(io);
  }, 30 * 1000);

  setInterval(async () => {
    const queueSize = await matchmaking.getQueueSize();
    if (queueSize >= 2) {
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
        let dbUserId1: string | null = null;
        let dbUserId2: string | null = null;

        if (clerkUserId1) {
          try {
            dbUserId1 = await getUserIdByClerkId(clerkUserId1);
            if (dbUserId1) {
              user1Info = await getPublicUserInfo(dbUserId1);
            }
          } catch (error) {
            logger.error(error as Error, "Failed to fetch user info");
          }
        }

        if (clerkUserId2) {
          try {
            dbUserId2 = await getUserIdByClerkId(clerkUserId2);
            if (dbUserId2) {
              user2Info = await getPublicUserInfo(dbUserId2);
            }
          } catch (error) {
            logger.error(error as Error, "Failed to fetch user info");
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

        if (dbUserId1) {
          sendPeerActionPush({
            userId: dbUserId1,
            peerSocket: user1Socket,
            title: "Match Found!",
            body: "Someone is ready to chat — head back!",
            url: "/call",
          }).catch((err: unknown) => logger.warn(err as Error, "Push to user1 failed"));
        }

        if (dbUserId2) {
          sendPeerActionPush({
            userId: dbUserId2,
            peerSocket: user2Socket,
            title: "Match Found!",
            body: "Someone is ready to chat — head back!",
            url: "/call",
          }).catch((err: unknown) => logger.warn(err as Error, "Push to user2 failed"));
        }
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

    for (const room of allRooms) {
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

      if (!user1Connected && !user2Connected) {
        logger.info("Both sockets disconnected in room %s - cleaning up", room.id);
        rooms.deleteRoom(room.id);
      }
    }
  }, 4000);
}

