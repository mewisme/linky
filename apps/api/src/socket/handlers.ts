import type { Namespace } from "socket.io";
import { type MessageData, type RoomData } from "@/types/socket/socket-event.types.js";
import { type AuthenticatedSocket } from "./auth.js";

export function setupSocketHandlers(io: Namespace): void {
  io.on("connection", (socket: AuthenticatedSocket) => {
    socket.on("message", (data: MessageData) => {
      io.emit("message", {
        ...data,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on("join-room", (room: string) => {
      socket.join(room);
      const roomData: RoomData = { socketId: socket.id, room };
      io.to(room).emit("user-joined", roomData);
    });

    socket.on("leave-room", (room: string) => {
      socket.leave(room);
      const roomData: RoomData = { socketId: socket.id, room };
      io.to(room).emit("user-left", roomData);
    });

    socket.on("disconnect", () => { });
  });
}

