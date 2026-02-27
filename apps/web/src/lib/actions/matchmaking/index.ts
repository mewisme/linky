'use server'

import { publicEnv } from '@/env/public-env';
import { serverFetch } from '@/lib/api/fetch/server-api';
import { trackEventServer } from '@/lib/analytics/events/server';
import { withSentryAction } from '@/lib/sentry/with-action';

interface QueueStatus {
  queueSize: number;
  estimatedWaitSeconds: number | null;
}

export async function getQueueStatus(): Promise<QueueStatus> {
  return withSentryAction("getQueueStatus", async () => {
    trackEventServer({ name: 'api_matchmaking_queue_status_get' });
    return serverFetch(`${publicEnv.API_URL}/api/v1/matchmaking/queue-status`, { token: true });
  });
}
