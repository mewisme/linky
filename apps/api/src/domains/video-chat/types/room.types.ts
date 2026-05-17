import type { ChatMessageSnapshot } from "@/domains/video-chat/types/chat-message.types.js";

export interface VideoChatRoomRealtimeTrack {
  trackName: string;
  mid?: string;
  kind: "audio" | "video";
  source: "camera" | "microphone" | "screen" | "screen-audio" | "unknown";
}

export interface VideoChatRoomRealtimeParticipant {
  sessionId: string;
  socketId: string;
  publishedTracks: VideoChatRoomRealtimeTrack[];
  subscribedMids: string[];
  createdAt: number;
}

export interface VideoChatRoomRealtimeState {
  participants: Record<string, VideoChatRoomRealtimeParticipant>;
}

export interface VideoChatRoom {
  user1: string;
  user2: string;
  startedAt: Date;
  recentChatMessages: ChatMessageSnapshot[];
}

export interface VideoChatRoomRecord extends VideoChatRoom {
  id: string;
  createdAt: Date;
  user1ClerkId?: string;
  user2ClerkId?: string;
  user1DbId?: string;
  user2DbId?: string;
  user1Timezone?: string;
  user2Timezone?: string;
  lastProjectedTotalExpUser1?: number;
  lastProjectedTotalExpUser2?: number;
  hasEmittedStreakCompletedUser1?: boolean;
  hasEmittedStreakCompletedUser2?: boolean;
  lastAnnouncedLevelUser1?: number;
  lastAnnouncedLevelUser2?: number;
  realtime?: VideoChatRoomRealtimeState;
}

