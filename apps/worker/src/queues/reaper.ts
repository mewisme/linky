import type { Logger } from "@ws/logger";
import {
  reapStrandedProcessingLists,
  type RedisListClient,
} from "@ws/sdk-internal";
import { JOB_REAPER_INTERVAL_MS } from "@ws/shared-types";

export type ReaperHandle = {
  stop: () => void;
};

export function startReaper(options: {
  client: RedisListClient;
  workerId: string;
  logger: Logger;
  intervalMs?: number;
}): ReaperHandle {
  const { client, workerId, logger } = options;
  const intervalMs = options.intervalMs ?? JOB_REAPER_INTERVAL_MS;

  let stopped = false;
  let running = false;

  const tick = async (): Promise<void> => {
    if (stopped || running) return;
    running = true;
    try {
      const result = await reapStrandedProcessingLists(client, { selfWorkerId: workerId });
      if (result.requeued > 0 || result.cleaned > 0) {
        logger.info(
          "reaper requeued stranded jobs (requeued=%d cleaned=%d)",
          result.requeued,
          result.cleaned,
        );
      }
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.warn(err, "reaper iteration failed (workerId=%s)", workerId);
    } finally {
      running = false;
    }
  };

  void tick();
  const timer = setInterval(() => {
    void tick();
  }, intervalMs);

  return {
    stop(): void {
      if (stopped) return;
      stopped = true;
      clearInterval(timer);
    },
  };
}
