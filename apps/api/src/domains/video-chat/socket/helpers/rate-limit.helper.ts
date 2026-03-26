import type { AuthenticatedSocket } from "@/socket/auth.js";

export const messageRateLimit = { windowMs: 10_000, maxCount: 20 };
export const attachmentRateLimit = { windowMs: 60_000, maxCount: 6 };
export const messageRateState = new Map<string, { count: number; resetAt: number }>();
export const attachmentRateState = new Map<string, { count: number; resetAt: number }>();

function getRateLimitKey(socket: AuthenticatedSocket): string {
  return socket.data.userId || socket.id;
}

export function checkRateLimit(
  state: Map<string, { count: number; resetAt: number }>,
  socket: AuthenticatedSocket,
  limit: { windowMs: number; maxCount: number },
): boolean {
  const key = getRateLimitKey(socket);
  const now = Date.now();
  const current = state.get(key);
  if (!current || current.resetAt <= now) {
    state.set(key, { count: 1, resetAt: now + limit.windowMs });
    return true;
  }
  if (current.count >= limit.maxCount) {
    return false;
  }
  current.count += 1;
  return true;
}

export function cleanupRateLimitState(socket: AuthenticatedSocket): void {
  const key = getRateLimitKey(socket);
  messageRateState.delete(key);
  attachmentRateState.delete(key);
}
