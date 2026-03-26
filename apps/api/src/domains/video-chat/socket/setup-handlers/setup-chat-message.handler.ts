import type {
  ChatMessageInputPayload,
  ChatMessagePayload,
  ChatTypingPayload,
} from "@/domains/video-chat/types/socket-event.types.js";
import type { AuthenticatedSocket } from "@/socket/auth.js";
import type { Namespace } from "socket.io";
import type { VideoChatRooms } from "../types.js";
import { sendPeerActionPush } from "@/contexts/peer-action-notification-context.js";
import { getDbUserId } from "../helpers/user.helper.js";
import {
  maxAttachmentBytes,
  sanitizeMessageText,
  estimateAttachmentSize,
  isAllowedType,
  createChatSnapshot,
  emitChatError,
} from "../helpers/chat-message.helper.js";
import {
  messageRateLimit,
  attachmentRateLimit,
  messageRateState,
  attachmentRateState,
  checkRateLimit,
} from "../helpers/rate-limit.helper.js";

export function setupChatMessageHandler(
  socket: AuthenticatedSocket,
  io: Namespace,
  rooms: VideoChatRooms,
): void {
  const handleChatSend = async (
    data: ChatMessageInputPayload,
    acknowledge?: (response: { ok: boolean; error?: string }) => void,
  ) => {
    if (!checkRateLimit(messageRateState, socket, messageRateLimit)) {
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

    if (data.attachment && !checkRateLimit(attachmentRateState, socket, attachmentRateLimit)) {
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

    const peerDbUserId = await getDbUserId(peerSocket as AuthenticatedSocket);
    if (peerDbUserId) {
      const notificationBody =
        payload.type === "text"
          ? `${payload.sender.displayName}: ${payload.message || ""}`
          : `${payload.sender.displayName} sent an attachment`;
      void sendPeerActionPush({
        userId: peerDbUserId,
        peerSocket: peerSocket as AuthenticatedSocket,
        title: "New chat message",
        body: notificationBody,
        url: "/call?open_chat_panel=true",
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
