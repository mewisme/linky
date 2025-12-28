import { Server as SocketIOServer } from "socket.io";
import { type Server as HTTPServer } from "http";
import { config } from "../config/index.js";
import { setupSocketHandlers } from "./handlers.js";
import { setupVideoChatHandlers } from "./video-chat.js";
import { socketAuthMiddleware } from "./auth.js";
import { MatchmakingService } from "../services/matchmaking.js";
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

  // Apply authentication middleware
  io.use(socketAuthMiddleware);

  // Initialize services
  const matchmaking = new MatchmakingService();
  const rooms = new RoomService();
  const userSessions = new UserSessionService();

  // Setup handlers
  setupSocketHandlers(io);
  setupVideoChatHandlers(io, matchmaking, rooms, userSessions);

  return io;
}

