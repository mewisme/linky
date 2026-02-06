import type {
  ChatMessageInputPayload,
  FavoriteNotifyPeerPayload,
  MuteTogglePayload,
  ReactionPayload,
  ResyncSessionPayload,
  ScreenShareTogglePayload,
  SignalPayload,
  VideoTogglePayload,
} from "@/domains/video-chat/types/socket-event.types.js";
import type { VideoChatContext, VideoChatMatchmaking, VideoChatRooms, VideoChatUserSessions } from "./types.js";

import type { AuthenticatedSocket } from "@/socket/auth.js";
import type { Namespace } from "socket.io";
import { createLogger } from "@repo/logger";
import { getUserIdByClerkId } from "@/infra/supabase/repositories/call-history.js";
import { isValidTimezone } from "@/utils/timezone.js";
import { recordCallHistory } from "@/domains/video-chat/socket/call-history.socket.js";

const logger = createLogger("api:video-chat:socket:handlers");

async function getDbUserId(socket: AuthenticatedSocket): Promise<string | null> {
  const clerkUserId = socket.data.userId;
  if (!clerkUserId) {
    return null;
  }
  return await getUserIdByClerkId(clerkUserId);
}

export function setupSocketHandlers(socket: AuthenticatedSocket, context: VideoChatContext): void {
  const { io, matchmaking, rooms, userSessions } = context;
  const userId = socket.data.userId || "unknown";

  socket.on("client:timezone:init", (payload: { timezone?: string }) => {
    const tz = typeof payload?.timezone === "string" ? payload.timezone.trim() : "";
    if (tz && isValidTimezone(tz)) {
      socket.data.timezone = tz;
    }
  });

  matchmaking.cleanupStaleSockets(io).catch((error) => {
    logger.error("Failed to cleanup stale sockets: %o", error instanceof Error ? error : new Error(String(error)));
  });

  const sessionResult = userSessions.tryActivateSession(userId, socket);
  if (!sessionResult.activated) {
    socket.emit("session-waiting", {
      message: "Another session is active. Please wait...",
      positionInQueue: sessionResult.positionInQueue || 0,
      queueSize: userSessions.getQueueSize(userId),
    });
  } else {
    socket.emit("session-activated", {
      message: "Your session is now active. You can proceed.",
    });
  }

  const checkActiveSession = (): boolean => {
    if (!userSessions.isActiveSession(userId, socket.id)) {
      socket.emit("error", {
        message: "Session is not active. Please wait for your turn.",
      });
      return false;
    }
    return true;
  };

  setupJoinHandler(socket, checkActiveSession, matchmaking, rooms);
  setupSkipHandler(socket, checkActiveSession, io, matchmaking, rooms);
  setupSignalHandler(socket, checkActiveSession, io, rooms);
  setupChatMessageHandler(socket, checkActiveSession, io, rooms);
  setupMuteToggleHandler(socket, io, rooms);
  setupVideoToggleHandler(socket, io, rooms);
  setupScreenShareHandler(socket, io, rooms);
  setupReactionHandler(socket, io, rooms);
  setupFavoriteNotificationHandler(socket, io, rooms);
  setupEndCallHandler(socket, checkActiveSession, io, matchmaking, rooms);
  setupResyncHandler(socket, userId, checkActiveSession, io, matchmaking, rooms);
  setupDisconnectHandler(socket, userId, io, matchmaking, rooms, userSessions);
}

function setupJoinHandler(
  socket: AuthenticatedSocket,
  checkActiveSession: () => boolean,
  matchmaking: VideoChatMatchmaking,
  rooms: VideoChatRooms,
): void {
  socket.on("join", async () => {
    if (!checkActiveSession()) {
      return;
    }

    if (rooms.isInRoom(socket.id)) {
      socket.emit("error", {
        message: "Already in a room. Please disconnect first.",
      });
      return;
    }

    const added = await matchmaking.enqueue(socket);
    if (!added) {
      socket.emit("error", {
        message: "Already in queue.",
      });
      return;
    }

    const queueSize = await matchmaking.getQueueSize();
    socket.emit("joined-queue", {
      message: "Waiting for a match...",
      queueSize,
    });
  });
}

function setupSkipHandler(
  socket: AuthenticatedSocket,
  checkActiveSession: () => boolean,
  io: Namespace,
  matchmaking: VideoChatMatchmaking,
  rooms: VideoChatRooms,
): void {
  socket.on("skip", async () => {
    if (!checkActiveSession()) {
      return;
    }

    const dbUserId = await getDbUserId(socket);
    if (!dbUserId) {
      return;
    }

    const room = rooms.getRoomByUser(socket.id);
    if (room) {
      const peerId = rooms.getPeer(socket.id);

      if (peerId) {
        const peerSocket = io.sockets.get(peerId) as AuthenticatedSocket | undefined;
        if (peerSocket) {
          const peerDbUserId = await getDbUserId(peerSocket);
          if (peerDbUserId) {
            await matchmaking.recordSkip(dbUserId, peerDbUserId);
            await matchmaking.recordSkip(peerDbUserId, dbUserId);
          }
        }

        rooms.deleteRoom(room.id);

        if (peerSocket) {
          const peerDbUserId = await getDbUserId(peerSocket);
          if (peerDbUserId) {
            const isPeerInQueue = await matchmaking.isInQueue(peerDbUserId);
            if (isPeerInQueue) {
              await matchmaking.removeUser(peerDbUserId);
            }

            const peerAdded = await matchmaking.enqueue(peerSocket);
            if (peerAdded) {
              const peerQueueSize = await matchmaking.getQueueSize();
              io.to(peerId).emit("peer-skipped", {
                message: "Peer skipped. Re-entering queue for next match...",
                queueSize: peerQueueSize,
              });
            } else {
              io.to(peerId).emit("peer-left", {
                message: "Peer skipped",
              });
            }
          }
        }
      }
    }

    const isInQueue = await matchmaking.isInQueue(dbUserId);
    if (isInQueue) {
      await matchmaking.removeUser(dbUserId);
    }

    const added = await matchmaking.enqueue(socket);
    if (!added) {
      logger.warn("Failed to re-queue user after skip: %s", socket.id);
    }

    const queueSize = await matchmaking.getQueueSize();
    socket.emit("skipped", {
      message: "Skipped. Looking for new match...",
      queueSize,
    });
  });
}

function setupSignalHandler(
  socket: AuthenticatedSocket,
  checkActiveSession: () => boolean,
  io: Namespace,
  rooms: VideoChatRooms,
): void {
  socket.on("signal", (data: SignalPayload) => {
    if (!checkActiveSession()) {
      return;
    }

    const room = rooms.getRoomByUser(socket.id);
    if (!room) {
      socket.emit("error", {
        message: "Not in a room. Cannot send signal.",
      });
      return;
    }

    const peerId = rooms.getPeer(socket.id);
    if (!peerId) {
      return;
    }

    const peerSocket = io.sockets.get(peerId);
    if (!peerSocket || !peerSocket.connected) {
      socket.emit("error", {
        message: "Peer disconnected. Cannot send signal.",
      });
      return;
    }

    io.to(peerId).emit("signal", data);
  });
}

function setupChatMessageHandler(
  socket: AuthenticatedSocket,
  checkActiveSession: () => boolean,
  io: Namespace,
  rooms: VideoChatRooms,
): void {
  socket.on("chat-message", (data: ChatMessageInputPayload) => {
    if (!checkActiveSession()) {
      return;
    }

    const room = rooms.getRoomByUser(socket.id);
    if (!room) {
      socket.emit("error", {
        message: "Not in a room. Cannot send chat message.",
      });
      return;
    }

    const peerId = rooms.getPeer(socket.id);
    if (!peerId) {
      return;
    }

    const peerSocket = io.sockets.get(peerId);
    if (!peerSocket || !peerSocket.connected) {
      return;
    }

    io.to(peerId).emit("chat-message", {
      message: data.message,
      timestamp: data.timestamp || Date.now(),
      senderId: socket.id,
      senderName: socket.data.userName || "Anonymous",
      senderImageUrl: socket.data.userImageUrl,
    });
  });
}

function setupMuteToggleHandler(socket: AuthenticatedSocket, io: Namespace, rooms: VideoChatRooms): void {
  socket.on("mute-toggle", (data: MuteTogglePayload) => {
    const room = rooms.getRoomByUser(socket.id);
    if (!room) {
      return;
    }

    const peerId = rooms.getPeer(socket.id);
    if (!peerId) {
      return;
    }

    const peerSocket = io.sockets.get(peerId);
    if (!peerSocket || !peerSocket.connected) {
      return;
    }

    io.to(peerId).emit("mute-toggle", {
      muted: data.muted,
    });
  });
}

function setupVideoToggleHandler(socket: AuthenticatedSocket, io: Namespace, rooms: VideoChatRooms): void {
  socket.on("video-toggle", (data: VideoTogglePayload) => {
    const room = rooms.getRoomByUser(socket.id);
    if (!room) {
      return;
    }

    const peerId = rooms.getPeer(socket.id);
    if (!peerId) {
      return;
    }

    const peerSocket = io.sockets.get(peerId);
    if (!peerSocket || !peerSocket.connected) {
      return;
    }

    io.to(peerId).emit("video-toggle", {
      videoOff: data.videoOff,
    });
  });
}

function setupScreenShareHandler(socket: AuthenticatedSocket, io: Namespace, rooms: VideoChatRooms): void {
  socket.on("screen-share:toggle", (data: ScreenShareTogglePayload) => {
    const room = rooms.getRoomByUser(socket.id);
    if (!room) {
      socket.emit("error", {
        message: "Not in a room",
      });
      return;
    }

    const peerId = rooms.getPeer(socket.id);
    if (!peerId) {
      return;
    }

    const peerSocket = io.sockets.get(peerId);
    if (!peerSocket || !peerSocket.connected) {
      return;
    }

    io.to(peerId).emit("screen-share:toggle", {
      sharing: data.sharing,
      streamId: data.streamId,
    });
  });
}

function setupReactionHandler(socket: AuthenticatedSocket, io: Namespace, rooms: VideoChatRooms): void {
  socket.on("reaction:triggered", (data: ReactionPayload) => {
    const reactionType = data.type || "heart";

    const room = rooms.getRoomByUser(socket.id);
    if (!room) {
      return;
    }

    const peerId = rooms.getPeer(socket.id);
    if (!peerId) {
      return;
    }

    const peerSocket = io.sockets.get(peerId);
    if (!peerSocket || !peerSocket.connected) {
      return;
    }

    io.to(peerId).emit("reaction:triggered", {
      count: data.count,
      type: reactionType,
      timestamp: data.timestamp || Date.now(),
    });
  });
}

function setupFavoriteNotificationHandler(socket: AuthenticatedSocket, io: Namespace, rooms: VideoChatRooms): void {
  socket.on("favorite:notify-peer", (data: FavoriteNotifyPeerPayload) => {
    const room = rooms.getRoomByUser(socket.id);
    if (!room) {
      return;
    }

    const peerId = rooms.getPeer(socket.id);
    if (!peerId) {
      return;
    }

    const peerSocket = io.sockets.get(peerId);
    if (!peerSocket || !peerSocket.connected) {
      return;
    }

    const eventName = data.action === "added" ? "favorite:added" : "favorite:removed";
    io.to(peerId).emit(eventName, {
      from_user_id: data.peer_user_id,
      from_user_name: data.user_name,
    });
  });
}

function setupEndCallHandler(
  socket: AuthenticatedSocket,
  checkActiveSession: () => boolean,
  io: Namespace,
  matchmaking: VideoChatMatchmaking,
  rooms: VideoChatRooms,
): void {
  socket.on("end-call", async () => {
    if (!checkActiveSession()) {
      return;
    }

    const dbUserId = await getDbUserId(socket);
    if (dbUserId) {
      const wasInQueue = await matchmaking.isInQueue(dbUserId);
      if (wasInQueue) {
        await matchmaking.removeUser(dbUserId);
      }
    }

    const room = rooms.getRoomByUser(socket.id);
    if (room) {
      const peerId = rooms.getPeer(socket.id);

      recordCallHistory(
        io,
        room,
        socket,
        peerId ? (io.sockets.get(peerId) as AuthenticatedSocket | undefined) : undefined,
      ).catch((error) => {
        logger.error("Failed to record call history: %s", error instanceof Error ? error.message : "Unknown error");
      });

      if (peerId) {
        const peerSocket = io.sockets.get(peerId);
        if (peerSocket && peerSocket.connected) {
          io.to(peerId).emit("end-call", {
            message: "Call ended by peer",
          });
        }
      }

      rooms.deleteRoom(room.id);
      logger.info("Call ended by user: %s", socket.id);
    }
  });
}

function setupResyncHandler(
  socket: AuthenticatedSocket,
  userId: string,
  checkActiveSession: () => boolean,
  io: Namespace,
  _matchmaking: VideoChatMatchmaking,
  rooms: VideoChatRooms,
): void {
  socket.on("resync-room-state", () => {
    socket.emit("resync-session", { timestamp: Date.now() });
  });

  socket.on("resync-session", async (data: ResyncSessionPayload) => {
    if (!checkActiveSession()) {
      return;
    }

    const existingRoom = rooms.getRoomByUser(socket.id);
    if (existingRoom) {
      return;
    }

    const roomWithUserId = rooms.findRoomByUserId(userId, io);
    if (!roomWithUserId) {
      socket.emit("error", {
        message: "No active room to resync. Please start a new call.",
      });
      return;
    }

    const oldSocketId = roomWithUserId.user1;
    const peerOldSocketId = roomWithUserId.user2;

    const user1Socket = io.sockets.get(oldSocketId) as AuthenticatedSocket | undefined;
    const isUser1 = user1Socket?.data.userId === userId;

    const socketIdToReplace = isUser1 ? oldSocketId : peerOldSocketId;
    const peerSocketId = isUser1 ? peerOldSocketId : oldSocketId;

    if (socketIdToReplace === socket.id) {
      return;
    }

    const peerSocket = io.sockets.get(peerSocketId) as AuthenticatedSocket | undefined;
    if (!peerSocket || !peerSocket.connected) {
      rooms.deleteRoom(roomWithUserId.id);
      socket.emit("peer-left", {
        message: "Peer disconnected. Room cleaned up.",
      });
      return;
    }

    const updated = rooms.updateSocketId(socketIdToReplace, socket.id);
    if (!updated) {
      logger.error("Failed to update socket ID in room");
      return;
    }

    logger.info("Session resynced: user=%s room=%s", userId, roomWithUserId.id);

    const peerId = rooms.getPeer(socket.id);
    if (peerId) {
      const _peerSocketFinal = io.sockets.get(peerId) as AuthenticatedSocket | undefined;
      const isOfferer =
        roomWithUserId.user1 === socket.id
          ? roomWithUserId.user1 < roomWithUserId.user2
          : roomWithUserId.user2 < roomWithUserId.user1;

      socket.emit("matched", {
        roomId: roomWithUserId.id,
        peerId,
        isOfferer,
        peerInfo: null,
        myInfo: null,
      });
    }
  });
}

function setupDisconnectHandler(
  socket: AuthenticatedSocket,
  userId: string,
  io: Namespace,
  matchmaking: VideoChatMatchmaking,
  rooms: VideoChatRooms,
  userSessions: VideoChatUserSessions,
): void {
  socket.on("disconnect", async (reason: string) => {
    const wasInRoom = rooms.isInRoom(socket.id);
    const room = wasInRoom ? rooms.getRoomByUser(socket.id) : undefined;

    userSessions.deactivateSession(userId, socket.id);

    const dbUserId = await getDbUserId(socket);
    if (dbUserId) {
      const wasInQueue = await matchmaking.isInQueue(dbUserId);
      if (wasInQueue) {
        await matchmaking.removeUser(dbUserId);
      }
    }

    if (room) {
      const peerId = rooms.getPeer(socket.id);
      const peerSocket = peerId ? (io.sockets.get(peerId) as AuthenticatedSocket | undefined) : undefined;

      recordCallHistory(io, room, socket, peerSocket).catch((error) => {
        logger.error("Failed to record call history: %s", error instanceof Error ? error.message : "Unknown error");
      });

      if (peerId && peerSocket && peerSocket.connected) {
        io.to(peerId).emit("end-call", {
          message: "Call ended - peer disconnected",
        });

        const peerDbUserId = await getDbUserId(peerSocket);
        if (peerDbUserId && dbUserId) {
          await matchmaking.recordSkip(dbUserId, peerDbUserId);
          await matchmaking.recordSkip(peerDbUserId, dbUserId);
        }

        if (peerDbUserId) {
          const isPeerInQueue = await matchmaking.isInQueue(peerDbUserId);
          if (isPeerInQueue) {
            await matchmaking.removeUser(peerDbUserId);
          }

          setTimeout(async () => {
            const stillConnected = peerSocket.connected && io.sockets.get(peerId);
            if (stillConnected) {
              await matchmaking.enqueue(peerSocket);
            }
          }, 5000);
        }
      }

      rooms.deleteRoom(room.id);
    }

    logger.info("Client disconnected: socket=%s user=%s reason=%s", socket.id, userId, reason);
  });
}

