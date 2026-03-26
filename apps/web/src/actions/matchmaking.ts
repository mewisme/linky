'use server'

import { serverFetch } from '@/lib/http/server-api';
import { withSentryQuery } from '@/lib/monitoring/with-action';
import { backendUrl } from '@/lib/http/backend-url';

interface QueueStatus {
  queueSize: number;
  estimatedWaitSeconds: number | null;
}

export async function getQueueStatus(): Promise<QueueStatus> {
  return withSentryQuery(
    "getQueueStatus",
    async () => serverFetch<QueueStatus>(backendUrl.matchmaking.queueStatus()),
  );
}
