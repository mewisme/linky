import {
  checkEmbeddingRegenerationNeeded,
  scheduleEmbeddingRegeneration,
} from "../../user/service/embedding-job.service.js";

import { createLogger } from "@repo/logger";
import { getUsersIdsPaginated } from "../../../infra/supabase/repositories/users.js";

const logger = createLogger("API:Admin:Embeddings:Service");

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUserId(id: unknown): id is string {
  return typeof id === "string" && id.trim().length > 0 && UUID_REGEX.test(id.trim());
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
