import { redisClient } from "../client.js";
import { REDIS_CACHE_KEYS } from "./keys.js";
import { withRedisTimeout } from "../timeout-wrapper.js";

const EXP_TODAY_TTL_SECONDS = 7 * 24 * 60 * 60;
const USER_LOCAL_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function incrExpToday(
  userId: string,
  userLocalDateStr: string,
  amount: number,
): Promise<void> {
  if (amount <= 0) return;
  if (!USER_LOCAL_DATE_REGEX.test(userLocalDateStr)) return;
  const key = REDIS_CACHE_KEYS.userExpToday(userId, userLocalDateStr);
  try {
    await withRedisTimeout(() => redisClient.incrBy(key, Math.floor(amount)), `exp-today-incr:${key}`);
    await withRedisTimeout(() => redisClient.expire(key, EXP_TODAY_TTL_SECONDS), `exp-today-expire:${key}`);
  } catch {
  }
}

export async function getExpToday(userId: string, userLocalDateStr: string): Promise<number> {
  if (!USER_LOCAL_DATE_REGEX.test(userLocalDateStr)) return 0;
  const key = REDIS_CACHE_KEYS.userExpToday(userId, userLocalDateStr);
  try {
    const v = await withRedisTimeout(() => redisClient.get(key), `exp-today-get:${key}`);
    const n = v ? parseInt(v, 10) : NaN;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}
