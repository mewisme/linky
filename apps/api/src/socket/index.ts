import { Server as SocketIOServer } from "socket.io";
import { type Server as HTTPServer } from "http";
import { config } from "../config/index.js";
import { setupSocketHandlers } from "./handlers.js";
import { setupVideoChatHandlers } from "./video-chat/index.js";
import { adminNamespaceAuthMiddleware, socketAuthMiddleware } from "./auth.js";
import { RedisMatchmakingService } from "../services/redis-matchmaking.js";
import { RoomService } from "../services/rooms.js";
import { UserSessionService } from "../services/user-sessions.js";

export function createSocketServer(httpServer: HTTPServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    path: "/ws",
    cors: {
      origin: config.corsOrigin,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  const chat = io.of("/chat");
  const admin = io.of("/admin");

  chat.use(socketAuthMiddleware);
  admin.use(socketAuthMiddleware);
  admin.use(adminNamespaceAuthMiddleware);

  const matchmaking = new RedisMatchmakingService();
  const rooms = new RoomService();
  const userSessions = new UserSessionService();

  setupSocketHandlers(chat);
  setupVideoChatHandlers(chat, matchmaking, rooms, userSessions);

  return io;
}

