import { type Server as SocketIOServer } from "socket.io";
import { RedisMatchmakingService } from "../../services/redis-matchmaking.js";
import { RoomService } from "../../services/rooms.js";
import { UserSessionService } from "../../services/user-sessions.js";
import { type AuthenticatedSocket } from "../auth.js";
import { setupSocketHandlers } from "./handlers.js";
import { setupMatchmakingInterval, setupRoomHeartbeat } from "./matchmaking.js";
import { setVideoChatContext } from "./context.js";
import type { VideoChatContext } from "./types.js";

export function setupVideoChatHandlers(
  io: SocketIOServer,
  matchmaking: RedisMatchmakingService,
  rooms: RoomService,
  userSessions: UserSessionService
): void {
  const context: VideoChatContext = {
    io,
    matchmaking,
    rooms,
    userSessions,
  };

  // Store context for access from HTTP routes
  setVideoChatContext(context);

  io.on("connection", (socket: AuthenticatedSocket) => {
    setupSocketHandlers(socket, context);
  });

  setupMatchmakingInterval(io, matchmaking, rooms);
  setupRoomHeartbeat(io, rooms);
}
