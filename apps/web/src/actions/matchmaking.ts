'use server'

import { publicEnv } from "@/shared/env/public-env";
import { serverFetch } from '@/lib/http/server-api';
import { withSentryQuery } from '@/lib/monitoring/with-action';

interface QueueStatus {
  queueSize: number;
  estimatedWaitSeconds: number | null;
}

export async function getQueueStatus(): Promise<QueueStatus> {
  return withSentryQuery(
    "getQueueStatus",
    async () => serverFetch<QueueStatus>(
      `${publicEnv.API_URL}/api/v1/matchmaking/queue-status`
    ),
  );
}
