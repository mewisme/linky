'use server'

import { backendUrl } from '@/lib/api/fetch/backend-url';
import { serverFetch } from '@/lib/api/fetch/server-api';

interface QueueStatus {
  queueSize: number;
  estimatedWaitSeconds: number | null;
}

export async function getQueueStatus(): Promise<QueueStatus> {
  return serverFetch(backendUrl.matchmaking.queueStatus(), { token: true });
}
