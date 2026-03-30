import type { Namespace } from "socket.io";
import { handlePresenceMessage } from "@/infra/presence/presence-handler.js";
import type { AuthenticatedSocket } from "./auth.js";

type PresenceState =
  | "offline"
  | "online"
  | "available"
  | "matching"
  | "in_call"
  | "idle";

function isPresenceState(value: unknown): value is PresenceState {
  return (
    value === "offline" ||
    value === "online" ||
    value === "available" ||
    value === "matching" ||
    value === "in_call" ||
    value === "idle"
  );
}

export function setupPresenceHandlers(chat: Namespace): void {
  chat.on("connection", (socket: AuthenticatedSocket) => {
    const userId = socket.data?.userId;
    if (!userId) return;

    void handlePresenceMessage(userId, "online");

    socket.on("client:presence", (payload: unknown) => {
      if (!payload || typeof payload !== "object") return;
      const state = (payload as { state?: unknown }).state;
      if (!isPresenceState(state)) return;
      void handlePresenceMessage(userId, state);
    });

    socket.on("disconnect", () => {
      void handlePresenceMessage(userId, "offline");
    });
  });
}

