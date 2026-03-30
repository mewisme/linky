'use server'

import { backendUrl } from '@/lib/http/backend-url';
import { serverFetch } from '@/lib/http/server-api';
import { withSentryAction } from '@/lib/monitoring/with-action';

export interface EmbeddingSyncResponse {
  accepted_user_ids: string[];
  skipped_user_ids: string[];
}

export interface EmbeddingCompareResponse {
  similarity_score: number;
  model_name: string;
  user_a_updated_at: string;
  user_b_updated_at: string;
}

export interface EmbeddingSimilarResponse {
  base_user_id: string;
  results: { user_id: string; similarity_score: number }[];
}

export interface EmbeddingSyncAllResponse {
  message: string;
}

export async function syncEmbeddings(userIds: string[]): Promise<EmbeddingSyncResponse> {
  return withSentryAction("syncEmbeddings", async () => {
    return serverFetch(backendUrl.admin.embeddingsSync(), {
      method: 'POST',
      body: JSON.stringify({ user_ids: userIds }),
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
      body: JSON.stringify({ user_id_a: userId1, user_id_b: userId2 }),
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
    });
  });
}

export async function syncAllEmbeddings(): Promise<EmbeddingSyncAllResponse> {
  return withSentryAction("syncAllEmbeddings", async () => {
    return serverFetch(backendUrl.admin.embeddingsSyncAll(), {
      method: 'POST',
    });
  });
}
