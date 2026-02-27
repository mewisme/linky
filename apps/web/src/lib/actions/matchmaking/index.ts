'use server'

import { publicEnv } from '@/env/public-env';
import { serverFetch } from '@/lib/api/fetch/server-api';
import { trackEventServer } from '@/lib/analytics/events/server';

interface QueueStatus {
  queueSize: number;
  estimatedWaitSeconds: number | null;
}

export async function getQueueStatus(): Promise<QueueStatus> {
  trackEventServer({ name: 'api_matchmaking_queue_status_get' });
  return serverFetch(`${publicEnv.API_URL}/api/v1/matchmaking/queue-status`, { token: true });
}
