'use server'

import { publicEnv } from "@/shared/env/public-env";
import { serverFetch } from '@/lib/http/server-api';
import { cacheTags } from '@/lib/cache/tags';
import { withSentryQuery } from '@/lib/monitoring/with-action';

interface QueueStatus {
  queueSize: number;
  estimatedWaitSeconds: number | null;
}

export async function getQueueStatus(): Promise<QueueStatus> {
  return withSentryQuery(
    "getQueueStatus",
    async (token) => serverFetch<QueueStatus>(
      `${publicEnv.API_URL}/api/v1/matchmaking/queue-status`, { preloadedToken: token }
    ),
    { keyParts: [cacheTags.matchmaking], tags: [cacheTags.matchmaking] },
  );
}
