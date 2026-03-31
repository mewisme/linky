import { createSocketServer } from "@/socket/index.js";
import { redisClient } from "@/infra/redis/client.js";

let ioRef: ReturnType<typeof createSocketServer> | null = null;

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
  await redisClient.sAdd(key, socketId);
  await redisClient.expire(key, 60 * 60);
  await handlePresenceMessage(userId, "online");
}

export async function handlePresenceDisconnect(
  userId: string,
  socketId: string
): Promise<void> {
  const key = socketsKeyForUser(userId);
  await redisClient.sRem(key, socketId);
  const remaining = await redisClient.sCard(key);
  if (remaining > 0) return;
  await redisClient.del(key);
  await handlePresenceMessage(userId, "offline");
}

export async function handlePresenceMessage(
  clientId: string,
  state: string
): Promise<void> {
  const now = Date.now();

  await redisClient.hSet("presence", clientId, state);
  await redisClient.hSet("presence:ts", clientId, now.toString());

  if (state === "available" || state === "matching") {
    await redisClient.sAdd("match:available", clientId);
    await redisClient.sRem("match:in_call", clientId);
  } else if (state === "in_call") {
    await redisClient.sRem("match:available", clientId);
    await redisClient.sAdd("match:in_call", clientId);
  } else if (state === "online" || state === "idle") {
    await redisClient.sRem("match:available", clientId);
    await redisClient.sRem("match:in_call", clientId);
  }

  if (state === "offline") {
    await redisClient.hDel("presence", clientId);
    await redisClient.hDel("presence:ts", clientId);
    await redisClient.sRem("match:available", clientId);
    await redisClient.sRem("match:in_call", clientId);
  }

  emitToAdminSockets(clientId, state, now);
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

