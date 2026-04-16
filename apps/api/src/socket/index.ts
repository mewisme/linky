import { Server as SocketIOServer } from "socket.io";
import { type Server as HTTPServer } from "http";
import { config } from "@/config/index.js";
import { setupSocketHandlers } from "./handlers.js";
import { setupVideoChatHandlers } from "@/domains/video-chat/socket/video-chat.socket.js";
import { socketAuthMiddleware } from "./auth.js";
import { setupAdminNamespace } from "@/domains/admin/socket/admin.socket.js";
import { MatchmakingService } from "@/domains/matchmaking/service/matchmaking.service.js";
import { MemoryMatchStateStore } from "@/domains/matchmaking/store/index.js";
import { RoomService } from "@/domains/video-chat/service/rooms.service.js";
import { createLogger } from "@/utils/logger.js";
import { setupPresenceHandlers } from "./presence.js";

const logger = createLogger("api:socket:server");

export function createSocketServer(httpServer: HTTPServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    path: "/ws",
    cors: {
      origin: config.corsOrigin,
      methods: ["GET", "POST"],
      credentials: true,
    },
    maxHttpBufferSize: config.socketMaxHttpBufferSize,
  });

  const chat = io.of("/chat");
  const admin = io.of("/admin");

  chat.use(socketAuthMiddleware);
  setupAdminNamespace(admin, { socketAuthMiddleware });

  const matchStateStore = new MemoryMatchStateStore();

  logger.info("Matchmaking mode: In-Memory");

  const matchmaking = new MatchmakingService(matchStateStore);
  const rooms = new RoomService();

  setupSocketHandlers(chat);
  setupPresenceHandlers(chat);
  setupVideoChatHandlers(chat, matchmaking, rooms);

  return io;
}

