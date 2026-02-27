'use server'

import { backendUrl } from '@/lib/api/fetch/backend-url';
import { serverFetch } from '@/lib/api/fetch/server-api';
import { trackEventServer } from '@/lib/analytics/events/server';

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
  trackEventServer({ name: 'api_admin_embeddings_sync_post', properties: { count: userIds.length } });
  return serverFetch(backendUrl.admin.embeddingsSync(), {
    method: 'POST',
    body: JSON.stringify({ user_ids: userIds }),
    token: true,
  });
}

export async function compareEmbeddings(
  userId1: string,
  userId2: string
): Promise<EmbeddingCompareResponse> {
  trackEventServer({
    name: 'api_admin_embeddings_compare_post',
    properties: { user_id_1: userId1, user_id_2: userId2 },
  });
  return serverFetch(backendUrl.admin.embeddingsCompare(), {
    method: 'POST',
    body: JSON.stringify({ user_id_1: userId1, user_id_2: userId2 }),
    token: true,
  });
}

export async function findSimilarUsers(
  userId: string,
  limit?: number
): Promise<EmbeddingSimilarResponse> {
  trackEventServer({
    name: 'api_admin_embeddings_similar_post',
    properties: { user_id: userId, limit: limit ?? null },
  });
  return serverFetch(backendUrl.admin.embeddingsSimilar(), {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, limit }),
    token: true,
  });
}
