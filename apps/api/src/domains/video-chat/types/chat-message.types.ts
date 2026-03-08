export type ChatMessageType = "text" | "image" | "video" | "audio" | "gif" | "sticker" | "system";

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

export interface ChatMessageInputPayload {
  id: string;
  type: ChatMessageType;
  message: string | null;
  attachment: ChatAttachment | null;
  metadata?: ChatMessageMetadata | null;
  timestamp?: number;
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

export type ChatAttachmentSnapshot = Omit<ChatAttachment, "data" | "preview"> & {
  data?: undefined;
  preview?: undefined;
};

export interface ChatMessageSnapshot {
  id: string;
  type: ChatMessageType;
  sender: ChatMessageSender;
  timestamp: number;
  message: string | null;
  attachment: ChatAttachmentSnapshot | null;
  metadata?: ChatMessageMetadata | null;
}
