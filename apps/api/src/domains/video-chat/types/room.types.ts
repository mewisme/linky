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
  user1DbId?: string;
  user2DbId?: string;
  user1Timezone?: string;
  user2Timezone?: string;
  lastProjectedTotalExpUser1?: number;
  lastProjectedTotalExpUser2?: number;
  hasEmittedStreakCompletedUser1?: boolean;
  hasEmittedStreakCompletedUser2?: boolean;
}

