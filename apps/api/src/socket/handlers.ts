import { type Server as SocketIOServer } from "socket.io";
import { type MessageData, type RoomData } from "../types/index.js";
import { Logger } from "../utils/logger.js";
import { type AuthenticatedSocket } from "./auth.js";

const logger = new Logger("SocketHandlers");

export function setupSocketHandlers(io: SocketIOServer): void {
  io.on("connection", (socket: AuthenticatedSocket) => {
    const userId = socket.data.userId || "unknown";
    logger.info("Client connected:", socket.id, "User:", userId);

    socket.on("message", (data: MessageData) => {
      logger.info("Message received:", data);
      io.emit("message", {
        ...data,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on("join-room", (room: string) => {
      socket.join(room);
      logger.info("Client", socket.id, "joined room:", room);
      const roomData: RoomData = { socketId: socket.id, room };
      io.to(room).emit("user-joined", roomData);
    });

    socket.on("leave-room", (room: string) => {
      socket.leave(room);
      logger.info("Client", socket.id, "left room:", room);
      const roomData: RoomData = { socketId: socket.id, room };
      io.to(room).emit("user-left", roomData);
    });

    socket.on("disconnect", () => {
      logger.warn("Client disconnected:", socket.id);
    });
  });
}

