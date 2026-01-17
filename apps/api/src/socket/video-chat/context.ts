import { type Server as SocketIOServer } from "socket.io";
import { RedisMatchmakingService } from "../../services/redis-matchmaking.js";
import { RoomService } from "../../services/rooms.js";
import { UserSessionService } from "../../services/user-sessions.js";
import type { VideoChatContext } from "./types.js";

/**
 * Shared video chat context that can be accessed from both socket handlers and HTTP routes.
 * Set during socket server initialization.
 */
let videoChatContext: VideoChatContext | null = null;

export function setVideoChatContext(context: VideoChatContext): void {
  videoChatContext = context;
}

export function getVideoChatContext(): VideoChatContext | null {
  return videoChatContext;
}
