'use server'

import { backendUrl } from '@/lib/http/backend-url';
import { serverFetch } from '@/lib/http/server-api';
import { withSentryAction } from '@/lib/monitoring/with-action';

import type {
  GoEmbeddingCompareResponse,
  GoEmbeddingSimilarResponse,
  GoEmbeddingSyncAllResponse,
  GoEmbeddingSyncResponse,
} from '@/lib/http/adapters/go-admin-embeddings';

export type EmbeddingSyncResponse = GoEmbeddingSyncResponse;
export type EmbeddingCompareResponse = GoEmbeddingCompareResponse;
export type EmbeddingSimilarResponse = GoEmbeddingSimilarResponse;
export type EmbeddingSyncAllResponse = GoEmbeddingSyncAllResponse;

export async function syncEmbeddings(userIds: string[]): Promise<EmbeddingSyncResponse> {
  return withSentryAction("syncEmbeddings", async () => {
    return serverFetch<GoEmbeddingSyncResponse>(backendUrl.admin.embeddingsSync(), {
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
    return serverFetch<GoEmbeddingCompareResponse>(backendUrl.admin.embeddingsCompare(), {
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
    return serverFetch<GoEmbeddingSimilarResponse>(backendUrl.admin.embeddingsSimilar(), {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, limit }),
    });
  });
}

export async function syncAllEmbeddings(): Promise<EmbeddingSyncAllResponse> {
  return withSentryAction("syncAllEmbeddings", async () => {
    return serverFetch<GoEmbeddingSyncAllResponse>(backendUrl.admin.embeddingsSyncAll(), {
      method: 'POST',
    });
  });
}
