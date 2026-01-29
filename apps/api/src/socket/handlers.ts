import type { Namespace } from "socket.io";
import { type MessageData, type RoomData } from "../types/socket/socket-event.types.js";
import { createLogger } from "@repo/logger";
import { type AuthenticatedSocket } from "./auth.js";

const logger = createLogger("socket:handlers");

export function setupSocketHandlers(io: Namespace): void {
  io.on("connection", (socket: AuthenticatedSocket) => {
    const userId = socket.data.userId || "unknown";
    logger.info("Client connected: %s, User: %s", socket.id, userId);

    socket.on("message", (data: MessageData) => {
      logger.info("Message received: %o", data);
      io.emit("message", {
        ...data,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on("join-room", (room: string) => {
      socket.join(room);
      logger.info("Client %s joined room: %s", socket.id, room);
      const roomData: RoomData = { socketId: socket.id, room };
      io.to(room).emit("user-joined", roomData);
    });

    socket.on("leave-room", (room: string) => {
      socket.leave(room);
      logger.info("Client %s left room: %s", socket.id, room);
      const roomData: RoomData = { socketId: socket.id, room };
      io.to(room).emit("user-left", roomData);
    });

    socket.on("disconnect", () => {
      logger.warn("Client %s disconnected", socket.id);
    });
  });
}

