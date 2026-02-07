import type { VideoChatContext, VideoChatMatchmaking, VideoChatRooms } from "@/domains/video-chat/socket/types.js";
import { setupMatchmakingInterval, setupRoomHeartbeat } from "@/domains/video-chat/socket/matchmaking.socket.js";

import type { AuthenticatedSocket } from "@/socket/auth.js";
import type { Namespace } from "socket.io";
import { setupSocketHandlers } from "@/domains/video-chat/socket/handlers.js";

let videoChatContext: VideoChatContext | null = null;

export function setVideoChatContext(context: VideoChatContext): void {
  videoChatContext = context;
}

export function getVideoChatContext(): VideoChatContext | null {
  return videoChatContext;
}

export function setupVideoChatHandlers(
  io: Namespace,
  matchmaking: VideoChatMatchmaking,
  rooms: VideoChatRooms,
): void {
  const context: VideoChatContext = {
    io,
    matchmaking,
    rooms,
  };

  setVideoChatContext(context);

  io.on("connection", (socket: AuthenticatedSocket) => {
    setupSocketHandlers(socket, context);
  });

  setupMatchmakingInterval(io, matchmaking, rooms);
  setupRoomHeartbeat(io, rooms);
}

