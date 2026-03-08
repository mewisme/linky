import type { ChatMessageType } from "@/features/chat/types/chat-message.types";

export const maxAttachmentBytes = 100 * 1024 * 1024;
export const maxImageDimension = 1920;
export const defaultImageQuality = 0.75;

export const WEBRTC_ATTACHMENT_TYPES: ChatMessageType[] = ["image", "video", "audio"];

export function isWebRtcAttachmentMessageType(type: string): type is ChatMessageType {
  return WEBRTC_ATTACHMENT_TYPES.includes(type as ChatMessageType);
}
