import { redisClient } from "@/infra/redis/client.js";
import { withRedisTimeout } from "@/infra/redis/timeout-wrapper.js";

const KEY_PREFIX = "linky:worker:idempotency:v1:";
const TTL_SECONDS = 172800;

export type GeneralJobIdempotencyOutcome = "new" | "replay" | "conflict";

export async function tryReserveGeneralJobIdempotency(
  idempotencyKey: string,
  bodyHash: string,
): Promise<GeneralJobIdempotencyOutcome> {
  const key = `${KEY_PREFIX}${idempotencyKey}`;
  return withRedisTimeout(async () => {
    const setResult = await redisClient.set(key, bodyHash, {
      NX: true,
      EX: TTL_SECONDS,
    });
    if (setResult === "OK") {
      return "new";
    }
    const existing = await redisClient.get(key);
    if (existing === bodyHash) {
      return "replay";
    }
    return "conflict";
  }, "worker-general-job-idempotency-reserve");
}

export async function releaseGeneralJobIdempotency(idempotencyKey: string): Promise<void> {
  const key = `${KEY_PREFIX}${idempotencyKey}`;
  try {
    await withRedisTimeout(() => redisClient.del(key), "worker-general-job-idempotency-release");
  } catch {
    return;
  }
}
