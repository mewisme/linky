import type { Logger } from "@ws/logger";
import {
  clearHeartbeat,
  refreshHeartbeat,
  type RedisListClient,
} from "@ws/sdk-internal";
import { WORKER_HEARTBEAT_REFRESH_MS } from "@ws/shared-types";

export type HeartbeatHandle = {
  stop: () => Promise<void>;
};

export function startHeartbeat(options: {
  client: RedisListClient;
  workerId: string;
  logger: Logger;
  intervalMs?: number;
}): HeartbeatHandle {
  const { client, workerId, logger } = options;
  const intervalMs = options.intervalMs ?? WORKER_HEARTBEAT_REFRESH_MS;

  let stopped = false;

  const tick = async (): Promise<void> => {
    try {
      await refreshHeartbeat(client, workerId);
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.warn(err, "heartbeat refresh failed (workerId=%s)", workerId);
    }
  };

  void tick();
  const timer = setInterval(() => {
    void tick();
  }, intervalMs);

  return {
    async stop(): Promise<void> {
      if (stopped) return;
      stopped = true;
      clearInterval(timer);
      try {
        await clearHeartbeat(client, workerId);
      } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.warn(err, "heartbeat clear failed (workerId=%s)", workerId);
      }
    },
  };
}
