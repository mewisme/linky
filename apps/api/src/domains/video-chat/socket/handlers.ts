import type { VideoChatContext } from "./types.js";
import type { AuthenticatedSocket } from "@/socket/auth.js";
import { isValidTimezone } from "@/utils/timezone.js";
import { setupJoinHandler } from "./setup-handlers/setup-join.handler.js";
import { setupSkipHandler } from "./setup-handlers/setup-skip.handler.js";
import { setupSignalHandler } from "./setup-handlers/setup-signal.handler.js";
import { setupChatMessageHandler } from "./setup-handlers/setup-chat-message.handler.js";
import { setupMuteToggleHandler } from "./setup-handlers/setup-mute-toggle.handler.js";
import { setupVideoToggleHandler } from "./setup-handlers/setup-video-toggle.handler.js";
import { setupScreenShareHandler } from "./setup-handlers/setup-screen-share.handler.js";
import { setupReactionHandler } from "./setup-handlers/setup-reaction.handler.js";
import { setupFavoriteNotificationHandler } from "./setup-handlers/setup-favorite-notification.handler.js";
import { setupEndCallHandler } from "./setup-handlers/setup-end-call.handler.js";
import { setupResyncHandler } from "./setup-handlers/setup-resync.handler.js";
import { setupDisconnectHandler } from "./setup-handlers/setup-disconnect.handler.js";

export function setupSocketHandlers(socket: AuthenticatedSocket, context: VideoChatContext): void {
  const { io, matchmaking, rooms } = context;
  const userId = socket.data.userId || "unknown";

  socket.on("client:timezone:init", (payload: { timezone?: string }) => {
    const tz = typeof payload?.timezone === "string" ? payload.timezone.trim() : "";
    if (tz && isValidTimezone(tz)) {
      socket.data.timezone = tz;
    }
  });

  socket.on("client:visibility:foreground", () => {
    socket.data.visibility = "foreground";
  });

  socket.on("client:visibility:background", () => {
    socket.data.visibility = "background";
  });

  setupJoinHandler(socket, matchmaking, rooms);
  setupSkipHandler(socket, io, matchmaking, rooms);
  setupSignalHandler(socket, io, rooms);
  setupChatMessageHandler(socket, io, rooms);
  setupMuteToggleHandler(socket, io, rooms);
  setupVideoToggleHandler(socket, io, rooms);
  setupScreenShareHandler(socket, io, rooms);
  setupReactionHandler(socket, io, rooms);
  setupFavoriteNotificationHandler(socket, io, rooms);
  setupEndCallHandler(socket, io, matchmaking, rooms);
  setupResyncHandler(socket, userId, io, matchmaking, rooms);
  setupDisconnectHandler(socket, userId, io, matchmaking, rooms);
}
