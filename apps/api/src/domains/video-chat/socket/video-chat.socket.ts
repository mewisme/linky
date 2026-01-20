import type { Namespace } from "socket.io";
import type { AuthenticatedSocket } from "../../../socket/auth.js";
import { setupSocketHandlers } from "./handlers.js";
import { setupMatchmakingInterval, setupRoomHeartbeat } from "./matchmaking.socket.js";
import type { VideoChatContext, VideoChatMatchmaking, VideoChatRooms, VideoChatUserSessions } from "./types.js";

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
  userSessions: VideoChatUserSessions,
): void {
  const context: VideoChatContext = {
    io,
    matchmaking,
    rooms,
    userSessions,
  };

  setVideoChatContext(context);

  io.on("connection", (socket: AuthenticatedSocket) => {
    setupSocketHandlers(socket, context);
  });

  setupMatchmakingInterval(io, matchmaking, rooms);
  setupRoomHeartbeat(io, rooms);
}

