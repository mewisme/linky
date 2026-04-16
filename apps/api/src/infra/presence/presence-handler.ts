import { createSocketServer } from "@/socket/index.js";
import { isPresenceState, type PresenceState } from "@/domains/admin/types/presence.types.js";

let ioRef: ReturnType<typeof createSocketServer> | null = null;
const userSockets = new Map<string, Set<string>>();
const presenceByUser = new Map<string, PresenceState>();

export function attachSocketIO(io: ReturnType<typeof createSocketServer>): void {
  ioRef = io;
}

function socketsKeyForUser(userId: string): string {
  return `presence:sockets:${userId}`;
}

export async function handlePresenceConnect(
  userId: string,
  socketId: string
): Promise<void> {
  const key = socketsKeyForUser(userId);
  const sockets = userSockets.get(key) ?? new Set<string>();
  sockets.add(socketId);
  userSockets.set(key, sockets);
  await handlePresenceMessage(userId, "online");
}

export async function handlePresenceDisconnect(
  userId: string,
  socketId: string
): Promise<void> {
  const key = socketsKeyForUser(userId);
  const sockets = userSockets.get(key);
  if (!sockets) {
    return;
  }

  sockets.delete(socketId);
  if (sockets.size > 0) {
    return;
  }

  userSockets.delete(key);
  await handlePresenceMessage(userId, "offline");
}

export async function handlePresenceMessage(
  clientId: string,
  state: string
): Promise<void> {
  if (!isPresenceState(state)) {
    return;
  }

  const now = Date.now();
  if (state === "offline") {
    presenceByUser.delete(clientId);
  } else {
    presenceByUser.set(clientId, state);
  }

  emitToAdminSockets(clientId, state, now);
}

export function getPresenceState(userId: string): PresenceState {
  return presenceByUser.get(userId) ?? "offline";
}

function emitToAdminSockets(
  clientId: string,
  state: string,
  updatedAt: number
): void {
  if (!ioRef) return;

  ioRef.of("/admin").emit("presence:update", {
    userId: clientId,
    state,
    updatedAt,
  });
}

