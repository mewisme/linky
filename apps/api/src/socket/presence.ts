import type { Namespace } from "socket.io";
import { isPresenceState } from "@/domains/admin/types/presence.types.js";
import {
  handlePresenceConnect,
  handlePresenceDisconnect,
  handlePresenceMessage,
} from "@/infra/presence/presence-handler.js";
import type { AuthenticatedSocket } from "./auth.js";

export function setupPresenceHandlers(chat: Namespace): void {
  chat.on("connection", (socket: AuthenticatedSocket) => {
    const userId = socket.data?.userId;
    if (!userId) return;

    void handlePresenceConnect(userId, socket.id);

    socket.on("client:presence", (payload: unknown) => {
      if (!payload || typeof payload !== "object") return;
      const state = (payload as { state?: unknown }).state;
      if (!isPresenceState(state)) return;
      void handlePresenceMessage(userId, state);
    });

    socket.on("disconnect", () => {
      void handlePresenceDisconnect(userId, socket.id);
    });
  });
}

