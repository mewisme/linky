import {
  checkEmbeddingRegenerationNeeded,
  scheduleEmbeddingRegeneration,
} from "../../user/service/embedding-job.service.js";
import {
  getAllUserEmbeddingsExcluding,
  getUserEmbeddingByUserId,
  getUserEmbeddingsByUserIds,
} from "../../../infra/supabase/repositories/user-embeddings.js";

import { cosineSimilarity } from "../../embeddings/index.js";
import { createLogger } from "@repo/logger";
import { getUsersIdsPaginated } from "../../../infra/supabase/repositories/users.js";

const logger = createLogger("API:Admin:Embeddings:Service");

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUserId(id: unknown): id is string {
  return typeof id === "string" && id.trim().length > 0 && UUID_REGEX.test(id.trim());
}

export type CompareUsersResult =
  | { ok: true; similarity_score: number; model_name: string; user_a_updated_at: string; user_b_updated_at: string }
  | { ok: false; error: string };

export async function compareUsers(userIdA: string, userIdB: string): Promise<CompareUsersResult> {
  const embeddings = await getUserEmbeddingsByUserIds([userIdA, userIdB]);
  const embA = embeddings.find((e) => e.user_id === userIdA);
  const embB = embeddings.find((e) => e.user_id === userIdB);

  if (!embA?.embedding || !embB?.embedding) {
    return { ok: false, error: "One or both users have no embedding" };
  }

  const score = cosineSimilarity(embA.embedding, embB.embedding);
  if (score === null) {
    return { ok: false, error: "Vectors have different lengths or are invalid" };
  }

  const modelName = embA.model_name ?? embB.model_name ?? "unknown";
  return {
    ok: true,
    similarity_score: score,
    model_name: modelName,
    user_a_updated_at: embA.updated_at,
    user_b_updated_at: embB.updated_at,
  };
}

const DEFAULT_SIMILAR_LIMIT = 10;
const MAX_SIMILAR_LIMIT = 100;

export type FindSimilarResult =
  | { ok: true; base_user_id: string; results: Array<{ user_id: string; similarity_score: number }> }
  | { ok: false; error: string };

export async function findSimilarUsers(
  userId: string,
  limit: number = DEFAULT_SIMILAR_LIMIT
): Promise<FindSimilarResult> {
  const base = await getUserEmbeddingByUserId(userId);
  if (!base?.embedding) {
    return { ok: false, error: "Base user has no embedding" };
  }

  const cappedLimit = Math.min(Math.max(1, Math.floor(limit)), MAX_SIMILAR_LIMIT);
  const others = await getAllUserEmbeddingsExcluding(userId);

  const scored: Array<{ user_id: string; similarity_score: number }> = [];
  for (const other of others) {
    if (!other.embedding) continue;
    const score = cosineSimilarity(base.embedding, other.embedding);
    if (score !== null) {
      scored.push({ user_id: other.user_id, similarity_score: score });
    }
  }

  scored.sort((a, b) => b.similarity_score - a.similarity_score);
  const top = scored.slice(0, cappedLimit);

  return {
    ok: true,
    base_user_id: userId,
    results: top,
  };
}

export async function syncEmbeddingsForUsers(userIds: string[]): Promise<{
  accepted_user_ids: string[];
  skipped_user_ids: string[];
}> {
  const accepted: string[] = [];
  const skipped: string[] = [];

  for (const userId of userIds) {
    try {
      const needed = await checkEmbeddingRegenerationNeeded(userId);
      if (needed) {
        accepted.push(userId);
        scheduleEmbeddingRegeneration(userId);
      } else {
        skipped.push(userId);
      }
    } catch (error) {
      logger.warn(
        "Embedding sync failed for user %s: %s",
        userId,
        error instanceof Error ? error.message : String(error)
      );
      skipped.push(userId);
    }
  }

  return { accepted_user_ids: accepted, skipped_user_ids: skipped };
}

export function scheduleSyncAllEmbeddings(): void {
  setImmediate(async () => {
    let page = 1;
    const limit = 100;

    try {
      let hasMore = true;
      while (hasMore) {
        const { ids, hasMore: more } = await getUsersIdsPaginated({ page, limit, deleted: false });

        for (const userId of ids) {
          try {
            const needed = await checkEmbeddingRegenerationNeeded(userId);
            if (needed) {
              scheduleEmbeddingRegeneration(userId);
            }
          } catch (error) {
            logger.warn(
              "Embedding sync-all failed for user %s: %s",
              userId,
              error instanceof Error ? error.message : String(error)
            );
          }
        }

        hasMore = more;
        page += 1;
      }
    } catch (error) {
      logger.error(
        "Embedding sync-all batch failed: %s",
        error instanceof Error ? error.message : String(error)
      );
    }
  });
}

export function validateUserIds(userIds: unknown): { valid: string[]; invalid: string[] } {
  if (!Array.isArray(userIds)) {
    return { valid: [], invalid: [] };
  }

  const valid: string[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();

  for (const id of userIds) {
    const trimmed = typeof id === "string" ? id.trim() : "";
    if (!trimmed) {
      continue;
    }
    if (seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    if (isValidUserId(trimmed)) {
      valid.push(trimmed);
    } else {
      invalid.push(trimmed);
    }
  }

  return { valid, invalid };
}
