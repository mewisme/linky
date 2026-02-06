import { Server as SocketIOServer } from "socket.io";
import { type Server as HTTPServer } from "http";
import { config } from "@/config/index.js";
import { setupSocketHandlers } from "./handlers.js";
import { setupVideoChatHandlers } from "@/domains/video-chat/socket/video-chat.socket.js";
import { socketAuthMiddleware } from "./auth.js";
import { setupAdminNamespace } from "@/domains/admin/socket/admin.socket.js";
import { RedisMatchmakingService } from "@/domains/matchmaking/service/redis-matchmaking.service.js";
import { RoomService } from "@/domains/video-chat/service/rooms.service.js";
import { UserSessionService } from "@/domains/video-chat/service/user-sessions.service.js";

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
  setupAdminNamespace(admin, { socketAuthMiddleware });

  const matchmaking = new RedisMatchmakingService();
  const rooms = new RoomService();
  const userSessions = new UserSessionService();

  setupSocketHandlers(chat);
  setupVideoChatHandlers(chat, matchmaking, rooms, userSessions);

  return io;
}

