export const messageRateLimit = { windowMs: 10_000, maxCount: 20 };
export const attachmentRateLimit = { windowMs: 60_000, maxCount: 6 };
export const messageRateState = new Map<string, { count: number; resetAt: number }>();
export const attachmentRateState = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  state: Map<string, { count: number; resetAt: number }>,
  socketId: string,
  limit: { windowMs: number; maxCount: number },
): boolean {
  const now = Date.now();
  const current = state.get(socketId);
  if (!current || current.resetAt <= now) {
    state.set(socketId, { count: 1, resetAt: now + limit.windowMs });
    return true;
  }
  if (current.count >= limit.maxCount) {
    return false;
  }
  current.count += 1;
  return true;
}
