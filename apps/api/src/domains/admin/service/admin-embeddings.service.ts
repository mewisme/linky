import {
  checkEmbeddingRegenerationNeeded,
  scheduleEmbeddingRegeneration,
} from "../../user/service/embedding-job.service.js";
import {
  findSimilarUsersByEmbedding,
  getUserEmbeddingByUserId,
  getUserEmbeddingsByUserIds,
} from "../../../infra/supabase/repositories/user-embeddings.js";

import { cosineSimilarity } from "../../embeddings/index.js";
import { createLogger } from "@repo/logger";
import { getUsersIdsPaginated } from "../../../infra/supabase/repositories/users.js";

const logger = createLogger("api:admin:embeddings:service");

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseEmbedding(value: string | number[] | null | undefined): number[] | null {
  if (value == null) return null;
  if (Array.isArray(value)) {
    return value.every((x) => typeof x === "number" && !Number.isNaN(x)) ? value : null;
  }
  try {
    const parsed = JSON.parse(value as string) as unknown;
    if (!Array.isArray(parsed) || !parsed.every((x) => typeof x === "number" && !Number.isNaN(x))) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

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

  const vecA = parseEmbedding(embA.embedding);
  const vecB = parseEmbedding(embB.embedding);
  if (!vecA || !vecB) {
    return { ok: false, error: "Invalid embedding format" };
  }

  const score = cosineSimilarity(vecA, vecB);
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

export type FindSimilarUsersOptions = {
  limit?: number
  threshold?: number
  excludeUserIds?: string[]
};

export async function findSimilarUsers(
  userId: string,
  options: FindSimilarUsersOptions | number = DEFAULT_SIMILAR_LIMIT
): Promise<FindSimilarResult> {
  const base = await getUserEmbeddingByUserId(userId);
  if (!base?.embedding) {
    return { ok: false, error: "Base user has no embedding" };
  }

  const opts = typeof options === "number" ? { limit: options } : options;
  const limit = opts.limit ?? DEFAULT_SIMILAR_LIMIT;
  const cappedLimit = Math.min(Math.max(1, Math.floor(limit)), MAX_SIMILAR_LIMIT);

  const results = await findSimilarUsersByEmbedding(userId, {
    limit: cappedLimit,
    threshold: opts.threshold,
    excludeUserIds: opts.excludeUserIds,
  });

  return {
    ok: true,
    base_user_id: userId,
    results,
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
