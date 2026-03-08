export interface SocketErrorPayload {
  message: string;
}

export interface QueueStatusPayload {
  message: string;
  queueSize: number;
}

export interface PeerLeftPayload {
  message: string;
}

export interface SignalPayload {
  type: string;
  sdp?: unknown;
  candidate?: unknown;
}

export interface ChatAttachmentSignalPayload {
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

