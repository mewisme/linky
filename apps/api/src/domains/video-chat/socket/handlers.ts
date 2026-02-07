import type {
  ChatAttachment,
  ChatErrorPayload,
  ChatMessageInputPayload,
  ChatMessagePayload,
  ChatMessageSnapshot,
  ChatMessageType,
  ChatTypingPayload,
  FavoriteNotifyPeerPayload,
  MuteTogglePayload,
  ReactionPayload,
  ResyncSessionPayload,
  ScreenShareTogglePayload,
  SignalPayload,
  VideoTogglePayload,
} from "@/domains/video-chat/types/socket-event.types.js";
import type { VideoChatContext, VideoChatMatchmaking, VideoChatRooms } from "./types.js";

import type { AuthenticatedSocket } from "@/socket/auth.js";
import type { Namespace } from "socket.io";
import { createLogger } from "@repo/logger";
import { getUserIdByClerkId } from "@/infra/supabase/repositories/call-history.js";
import { isValidTimezone } from "@/utils/timezone.js";
import { recordCallHistory } from "@/domains/video-chat/socket/call-history.socket.js";
import { sendPeerActionPush } from "@/contexts/peer-action-notification-context.js";

const logger = createLogger("api:video-chat:socket:handlers");
const maxAttachmentBytes = 5 * 1024 * 1024;
const maxMessageLength = 2000;
const messageRateLimit = { windowMs: 10_000, maxCount: 20 };
const attachmentRateLimit = { windowMs: 60_000, maxCount: 6 };
const messageRateState = new Map<string, { count: number; resetAt: number }>();
const attachmentRateState = new Map<string, { count: number; resetAt: number }>();

async function getDbUserId(socket: AuthenticatedSocket): Promise<string | null> {
  const clerkUserId = socket.data.userId;
  if (!clerkUserId) {
    return null;
  }
  return await getUserIdByClerkId(clerkUserId);
}

function sanitizeMessageText(message: string | null): string | null {
  if (typeof message !== "string") return null;
  const trimmed = message.trim();
  if (!trimmed) return null;
  const cleaned = trimmed.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  return cleaned.length > maxMessageLength ? cleaned.slice(0, maxMessageLength) : cleaned;
}

function stripDataUrlPrefix(data: string): string {
  const commaIndex = data.indexOf(",");
  if (commaIndex === -1) {
    return data;
  }
  return data.slice(commaIndex + 1);
}

function estimateAttachmentSize(attachment: ChatAttachment | null): number {
  if (!attachment) return 0;
  const declaredSize = typeof attachment.size === "number" && Number.isFinite(attachment.size) ? attachment.size : 0;
  const data = typeof attachment.data === "string" ? stripDataUrlPrefix(attachment.data) : "";
  const dataSize = data ? Buffer.byteLength(data, "base64") : 0;
  return Math.max(declaredSize, dataSize);
}

function isAllowedType(type: string): type is ChatMessageType {
  return ["text", "image", "gif", "sticker", "system"].includes(type);
}

function createChatSnapshot(message: ChatMessagePayload): ChatMessageSnapshot {
  const attachment = message.attachment
    ? {
      mimeType: message.attachment.mimeType,
      size: message.attachment.size,
      width: message.attachment.width,
      height: message.attachment.height,
      duration: message.attachment.duration,
    }
    : null;
  return {
    id: message.id,
    type: message.type,
    sender: message.sender,
    timestamp: message.timestamp,
    message: message.message,
    attachment,
    metadata: message.metadata || null,
  };
}

function checkRateLimit(
  state: Map<string, { count: number; resetAt: number }>,
  socketId: string,
  limit: { windowMs: number; maxCount: number },
): boolean {
  const now = Date.now();
  const current = state.get(socketId);
  if (!current || current.resetAt <= now) {
    state.set(socketId, { count: 1, resetAt: now + limit.windowMs });
    return true;
  }
  if (current.count >= limit.maxCount) {
    return false;
  }
  current.count += 1;
  return true;
}

function emitChatError(socket: AuthenticatedSocket, message: string): void {
  const payload: ChatErrorPayload = { message };
  socket.emit("chat:error", payload);
}

export function setupSocketHandlers(socket: AuthenticatedSocket, context: VideoChatContext): void {
  const { io, matchmaking, rooms } = context;
  const userId = socket.data.userId || "unknown";

  socket.on("client:timezone:init", (payload: { timezone?: string }) => {
    const tz = typeof payload?.timezone === "string" ? payload.timezone.trim() : "";
    if (tz && isValidTimezone(tz)) {
      socket.data.timezone = tz;
    }
  });

  setupJoinHandler(socket, matchmaking, rooms);
  setupSkipHandler(socket, io, matchmaking, rooms);
  setupSignalHandler(socket, io, rooms);
  setupChatMessageHandler(socket, io, rooms);
  setupMuteToggleHandler(socket, io, rooms);
  setupVideoToggleHandler(socket, io, rooms);
  setupScreenShareHandler(socket, io, rooms);
  setupReactionHandler(socket, io, rooms);
  setupFavoriteNotificationHandler(socket, io, rooms);
  setupEndCallHandler(socket, io, matchmaking, rooms);
  setupResyncHandler(socket, userId, io, matchmaking, rooms);
  setupDisconnectHandler(socket, userId, io, matchmaking, rooms);
}

function setupJoinHandler(
  socket: AuthenticatedSocket,
  matchmaking: VideoChatMatchmaking,
  rooms: VideoChatRooms,
): void {
  socket.on("join", async () => {
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
  io: Namespace,
  matchmaking: VideoChatMatchmaking,
  rooms: VideoChatRooms,
): void {
  socket.on("skip", async () => {
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

        if (peerSocket && peerSocket.connected) {
          const peerDbUserId = await getDbUserId(peerSocket);
          if (peerDbUserId) {
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

    const added = await matchmaking.enqueue(socket);
    if (!added) {
      logger.warn("Failed to re-queue user after skip: socket=%s userId=%s", socket.id, dbUserId);
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
  io: Namespace,
  rooms: VideoChatRooms,
): void {
  socket.on("signal", (data: SignalPayload) => {
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
  io: Namespace,
  rooms: VideoChatRooms,
): void {
  const handleChatSend = async (
    data: ChatMessageInputPayload,
    acknowledge?: (response: { ok: boolean; error?: string }) => void,
  ) => {
    if (!checkRateLimit(messageRateState, socket.id, messageRateLimit)) {
      emitChatError(socket, "Message rate limit exceeded.");
      acknowledge?.({ ok: false, error: "Message rate limit exceeded." });
      return;
    }

    const room = rooms.getRoomByUser(socket.id);
    if (!room) {
      emitChatError(socket, "Not in a room. Cannot send chat message.");
      acknowledge?.({ ok: false, error: "Not in a room." });
      return;
    }

    const peerId = rooms.getPeer(socket.id);
    if (!peerId) {
      acknowledge?.({ ok: false, error: "Peer not found." });
      return;
    }

    const peerSocket = io.sockets.get(peerId);
    if (!peerSocket || !peerSocket.connected) {
      acknowledge?.({ ok: false, error: "Peer disconnected." });
      return;
    }

    if (!data || typeof data !== "object" || !isAllowedType(data.type)) {
      emitChatError(socket, "Invalid chat message.");
      acknowledge?.({ ok: false, error: "Invalid chat message." });
      return;
    }

    if (typeof data.id !== "string" || data.id.length < 4) {
      emitChatError(socket, "Invalid chat message id.");
      acknowledge?.({ ok: false, error: "Invalid chat message id." });
      return;
    }

    const sanitizedMessage = sanitizeMessageText(data.message);
    const attachmentSize = estimateAttachmentSize(data.attachment);
    if (data.attachment && attachmentSize > maxAttachmentBytes) {
      emitChatError(socket, "Attachment exceeds size limit.");
      acknowledge?.({ ok: false, error: "Attachment exceeds size limit." });
      return;
    }

    if (data.attachment && !checkRateLimit(attachmentRateState, socket.id, attachmentRateLimit)) {
      emitChatError(socket, "Attachment rate limit exceeded.");
      acknowledge?.({ ok: false, error: "Attachment rate limit exceeded." });
      return;
    }

    if (data.type === "text" && !sanitizedMessage) {
      emitChatError(socket, "Message cannot be empty.");
      acknowledge?.({ ok: false, error: "Message cannot be empty." });
      return;
    }

    if (data.type === "image" && typeof data.attachment?.data !== "string") {
      emitChatError(socket, "Attachment data missing.");
      acknowledge?.({ ok: false, error: "Attachment data missing." });
      return;
    }

    if ((data.type === "gif" || data.type === "sticker") && !data.metadata?.url) {
      emitChatError(socket, "Media reference missing.");
      acknowledge?.({ ok: false, error: "Media reference missing." });
      return;
    }

    const payload: ChatMessagePayload = {
      id: data.id,
      type: data.type,
      sender: {
        socketId: socket.id,
        userId: socket.data.userId || "unknown",
        displayName: socket.data.userName || "Anonymous",
        avatarUrl: socket.data.userImageUrl || null,
      },
      timestamp: data.timestamp || Date.now(),
      message: sanitizedMessage,
      attachment: data.attachment || null,
      metadata: data.metadata || null,
    };

    rooms.addChatSnapshot(room.id, createChatSnapshot(payload));

    io.to(peerId).emit("chat:message", payload);
    acknowledge?.({ ok: true });

    const peerDbUserId = await getDbUserId(peerSocket);
    if (peerDbUserId) {
      const notificationBody =
        payload.type === "text"
          ? `${payload.sender.displayName}: ${payload.message || ""}`
          : `${payload.sender.displayName} sent an attachment`;
      void sendPeerActionPush({
        userId: peerDbUserId,
        title: "New chat message",
        body: notificationBody,
        url: "/chat?open_chat_panel=true",
      });
    }
  };

  socket.on("chat:send", (data: ChatMessageInputPayload, acknowledge) => {
    void handleChatSend(data, acknowledge);
  });

  socket.on("chat:attachment:send", (data: ChatMessageInputPayload, acknowledge) => {
    void handleChatSend(data, acknowledge);
  });

  socket.on("chat:typing", (data: ChatTypingPayload) => {
    const room = rooms.getRoomByUser(socket.id);
    if (!room) {
      return;
    }
    const peerId = rooms.getPeer(socket.id);
    if (!peerId) {
      return;
    }
    io.to(peerId).emit("chat:typing", {
      isTyping: !!data?.isTyping,
      timestamp: Date.now(),
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
  socket.on("screen-share:toggle", async (data: ScreenShareTogglePayload) => {
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

    if (data.sharing) {
      const peerDbUserId = await getDbUserId(peerSocket);
      if (peerDbUserId) {
        void sendPeerActionPush({
          userId: peerDbUserId,
          title: "Screen sharing started",
          body: `${socket.data.userName || "Anonymous"} started sharing their screen`,
          url: "/chat",
        });
      }
    }
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
  io: Namespace,
  matchmaking: VideoChatMatchmaking,
  rooms: VideoChatRooms,
): void {
  socket.on("end-call", async () => {
    const dbUserId = await getDbUserId(socket);
    if (dbUserId) {
      await matchmaking.dequeueIfOwner(dbUserId, socket.id, "end-call");
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
      logger.debug("Call ended by user: %s", socket.id);
    }
  });
}

function setupResyncHandler(
  socket: AuthenticatedSocket,
  userId: string,
  io: Namespace,
  _matchmaking: VideoChatMatchmaking,
  rooms: VideoChatRooms,
): void {
  socket.on("resync-room-state", () => {
    socket.emit("resync-session", { timestamp: Date.now() });
  });

  socket.on("resync-session", async (data: ResyncSessionPayload) => {
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
): void {
  socket.on("disconnect", async (reason: string) => {
    const isNamespaceDisconnect = reason === "client namespace disconnect" || reason === "server namespace disconnect";
    const wasInRoom = rooms.isInRoom(socket.id);
    const room = wasInRoom ? rooms.getRoomByUser(socket.id) : undefined;

    const dbUserId = await getDbUserId(socket);

    if (dbUserId) {
      await matchmaking.dequeueIfOwner(dbUserId, socket.id, "disconnect");
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
          await matchmaking.dequeueIfOwner(peerDbUserId, peerSocket.id, "peer-disconnect");
        }
      }

      rooms.deleteRoom(room.id);
    }

    messageRateState.delete(socket.id);
    attachmentRateState.delete(socket.id);

    if (!isNamespaceDisconnect) {
      logger.info("Client disconnected: socket=%s user=%s reason=%s wasInRoom=%s", socket.id, userId, reason, wasInRoom);
    } else {
      logger.debug("Namespace disconnect (in-room): socket=%s user=%s reason=%s", socket.id, userId, reason);
    }
  });
}

