'use server'

import { backendUrl } from '@/lib/api/fetch/backend-url';
import { serverFetch } from '@/lib/api/fetch/server-api';
import { trackEventServer } from '@/lib/analytics/events/server';

interface QueueStatus {
  queueSize: number;
  estimatedWaitSeconds: number | null;
}

export async function getQueueStatus(): Promise<QueueStatus> {
  trackEventServer({ name: 'api_matchmaking_queue_status_get' });
  return serverFetch(backendUrl.matchmaking.queueStatus(), { token: true });
}
