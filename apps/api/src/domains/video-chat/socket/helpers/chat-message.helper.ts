import type {
  ChatAttachment,
  ChatErrorPayload,
  ChatMessagePayload,
  ChatMessageSnapshot,
  ChatMessageType,
} from "@/domains/video-chat/types/socket-event.types.js";
import type { AuthenticatedSocket } from "@/socket/auth.js";

export const maxAttachmentBytes = 100 * 1024 * 1024;
export const maxMessageLength = 2000;

export function sanitizeMessageText(message: string | null): string | null {
  if (typeof message !== "string") return null;
  const trimmed = message.trim();
  if (!trimmed) return null;
  const cleaned = trimmed.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  return cleaned.length > maxMessageLength ? cleaned.slice(0, maxMessageLength) : cleaned;
}

export function stripDataUrlPrefix(data: string): string {
  const commaIndex = data.indexOf(",");
  if (commaIndex === -1) {
    return data;
  }
  return data.slice(commaIndex + 1);
}

export function estimateAttachmentSize(attachment: ChatAttachment | null): number {
  if (!attachment) return 0;
  const declaredSize = typeof attachment.size === "number" && Number.isFinite(attachment.size) ? attachment.size : 0;
  const data = typeof attachment.data === "string" ? stripDataUrlPrefix(attachment.data) : "";
  const dataSize = data ? Buffer.byteLength(data, "base64") : 0;
  return Math.max(declaredSize, dataSize);
}

export const WEBRTC_ATTACHMENT_TYPES: ChatMessageType[] = ["image", "video", "audio"];

export function isWebRtcAttachmentType(type: string): type is ChatMessageType {
  return WEBRTC_ATTACHMENT_TYPES.includes(type as ChatMessageType);
}

export function isAllowedType(type: string): type is ChatMessageType {
  return ["text", "image", "video", "audio", "gif", "sticker", "system"].includes(type);
}

export function createChatSnapshot(message: ChatMessagePayload): ChatMessageSnapshot {
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

export function emitChatError(socket: AuthenticatedSocket, message: string): void {
  const payload: ChatErrorPayload = { message };
  socket.emit("chat:error", payload);
}
