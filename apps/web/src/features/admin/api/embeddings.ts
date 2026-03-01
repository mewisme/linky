'use server'

import { backendUrl } from '@/lib/http/backend-url';
import { serverFetch } from '@/lib/http/server-api';
import { withSentryAction } from '@/lib/monitoring/with-action';

export interface EmbeddingSyncResponse {
  accepted_user_ids: string[];
  skipped_user_ids: string[];
}

export interface EmbeddingCompareResponse {
  similarity: number;
  user1: string;
  user2: string;
}

export interface EmbeddingSimilarResponse {
  similar_users: { user_id: string; similarity: number }[];
}

export async function syncEmbeddings(userIds: string[]): Promise<EmbeddingSyncResponse> {
  return withSentryAction("syncEmbeddings", async () => {
    return serverFetch(backendUrl.admin.embeddingsSync(), {
      method: 'POST',
      body: JSON.stringify({ user_ids: userIds }),
      token: true,
    });
  });
}

export async function compareEmbeddings(
  userId1: string,
  userId2: string
): Promise<EmbeddingCompareResponse> {
  return withSentryAction("compareEmbeddings", async () => {
    return serverFetch(backendUrl.admin.embeddingsCompare(), {
      method: 'POST',
      body: JSON.stringify({ user_id_1: userId1, user_id_2: userId2 }),
      token: true,
    });
  });
}

export async function findSimilarUsers(
  userId: string,
  limit?: number
): Promise<EmbeddingSimilarResponse> {
  return withSentryAction("findSimilarUsers", async () => {
    return serverFetch(backendUrl.admin.embeddingsSimilar(), {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, limit }),
      token: true,
    });
  });
}
