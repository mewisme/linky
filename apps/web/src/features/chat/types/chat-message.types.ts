export type ChatMessageType = "text" | "image" | "video" | "audio" | "gif" | "sticker" | "system";

export type ChatMessageDeliveryStatus = "sending" | "sent" | "failed";

export interface ChatMessageSender {
  socketId: string;
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
}

export interface ChatAttachment {
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
  data?: string | null;
  preview?: string | null;
}

export interface ChatMessageMetadata {
  replyTo?: string;
  compressRatio?: number;
  source?: "giphy";
  gifId?: string;
  stickerId?: string;
  url?: string;
}

export interface ChatMessagePayload {
  id: string;
  type: ChatMessageType;
  sender: ChatMessageSender;
  timestamp: number;
  message: string | null;
  attachment: ChatAttachment | null;
  metadata?: ChatMessageMetadata | null;
}

export interface ChatMessageDraft {
  type: ChatMessageType;
  message: string | null;
  attachment: ChatAttachment | null;
  metadata?: ChatMessageMetadata | null;
}

export interface ChatMessageInputPayload extends ChatMessageDraft {
  id: string;
  timestamp?: number;
}

export interface ChatMessage extends ChatMessagePayload {
  isOwn: boolean;
  localStatus?: ChatMessageDeliveryStatus;
}

export interface ChatSendAck {
  ok: boolean;
  error?: string;
}

export interface ChatTypingPayload {
  isTyping: boolean;
  timestamp: number;
}

export interface ChatErrorPayload {
  message: string;
}
