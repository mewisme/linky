import type { BackendUserMessage } from "@ws/shared-types";

export interface SocketErrorPayload {
  message: string;
  userMessage: BackendUserMessage;
}

export interface QueueStatusPayload {
  message: string;
  userMessage: BackendUserMessage;
  queueSize: number;
}

export interface PeerLeftPayload {
  message: string;
  userMessage: BackendUserMessage;
}

export interface PeerSkippedPayload {
  message: string;
  userMessage: BackendUserMessage;
  queueSize: number;
}

export interface SkippedPayload {
  message: string;
  userMessage: BackendUserMessage;
  queueSize: number;
}

export interface SignalPayload {
  type: string;
  sdp?: unknown;
  candidate?: unknown;
}

export type {
  ChatAttachment,
  ChatAttachmentSnapshot,
  ChatMessageInputPayload,
  ChatMessageMetadata,
  ChatMessagePayload,
  ChatMessageSender,
  ChatMessageSnapshot,
  ChatMessageType,
} from "./chat-message.types.js";

export interface ChatTypingPayload {
  isTyping: boolean;
  timestamp: number;
}

export interface ChatErrorPayload {
  message: string;
  userMessage: BackendUserMessage;
}

export interface MuteTogglePayload {
  muted: boolean;
}

export interface VideoTogglePayload {
  videoOff: boolean;
}

export interface ReactionPayload {
  count: number;
  type?: string;
  timestamp: number;
}

export interface FavoriteNotifyPeerPayload {
  action: "added" | "removed";
  peer_user_id: string;
  user_name: string;
}

export interface FavoriteEventPayload {
  from_user_id: string;
  from_user_name: string;
}

export interface EndCallPayload {
  message: string;
  userMessage: BackendUserMessage;
}

export interface ResyncSessionPayload {
  timestamp?: number;
}

export interface MatchedPayload {
  roomId: string;
  peerId: string;
  isOfferer: boolean;
  peerInfo: unknown | null;
  myInfo: unknown | null;
}

export interface RoomPingPayload {
  timestamp: number;
  roomId: string;
}

export interface ScreenShareTogglePayload {
  sharing: boolean;
  streamId?: string;
}

export interface QueueTimeoutPayload {
  message: string;
  userMessage: BackendUserMessage;
}

export interface VideoChatErrorPayload {
  message: string;
  userMessage: BackendUserMessage;
}
