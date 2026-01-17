import { type Server as SocketIOServer } from "socket.io";
import { RedisMatchmakingService } from "../../services/redis-matchmaking.js";
import { RoomService } from "../../services/rooms.js";
import { UserSessionService } from "../../services/user-sessions.js";
import { type AuthenticatedSocket } from "../auth.js";

export interface VideoChatContext {
  io: SocketIOServer;
  matchmaking: RedisMatchmakingService;
  rooms: RoomService;
  userSessions: UserSessionService;
}

export interface Room {
  user1: string;
  user2: string;
  startedAt: Date;
}
