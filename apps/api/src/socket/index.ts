import { Server as SocketIOServer } from "socket.io";
import { type Server as HTTPServer } from "http";
import { config } from "../config/index.js";
import { setupSocketHandlers } from "./handlers.js";
import { setupVideoChatHandlers } from "./video-chat/index.js";
import { socketAuthMiddleware } from "./auth.js";
import { RedisMatchmakingService } from "../services/redis-matchmaking.js";
import { RoomService } from "../services/rooms.js";
import { UserSessionService } from "../services/user-sessions.js";

export function createSocketServer(httpServer: HTTPServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.corsOrigin,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.use(socketAuthMiddleware);

  const matchmaking = new RedisMatchmakingService();
  const rooms = new RoomService();
  const userSessions = new UserSessionService();

  setupSocketHandlers(io);
  setupVideoChatHandlers(io, matchmaking, rooms, userSessions);

  return io;
}

