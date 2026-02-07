import type { ChatMessageSnapshot } from "@/domains/video-chat/types/chat-message.types.js";

export interface VideoChatRoom {
  user1: string;
  user2: string;
  startedAt: Date;
  recentChatMessages: ChatMessageSnapshot[];
}

export interface VideoChatRoomRecord extends VideoChatRoom {
  id: string;
  createdAt: Date;
}

