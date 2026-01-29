import { getUserEmbeddingByUserId, upsertUserEmbedding } from "../../../infra/supabase/repositories/user-embeddings.js";

import { buildEmbeddingInput } from "./embedding-input.builder.js";
import { createHash } from "node:crypto";
import { createLogger } from "@repo/logger";
import { embedText } from "../../../infra/ollama/embedding.service.js";
import { getFavoritesByUserId } from "../../../infra/supabase/repositories/favorites.js";
import { getUserProfileAggregateByUserId } from "./user-profile.service.js";

const logger = createLogger("API:User:EmbeddingJob");

function computeSourceHash(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

async function runEmbeddingJob(userId: string): Promise<void> {
  try {
    const [profile, favorites] = await Promise.all([
      getUserProfileAggregateByUserId(userId),
      getFavoritesByUserId(userId),
    ]);

    if (!profile) {
      logger.warn("Embedding job skipped: profile not found for user %s", userId);
      return;
    }

    const state = {
      user: profile.user,
      details: profile.details as Parameters<typeof buildEmbeddingInput>[0]["details"],
      favoriteUserIds: favorites ?? [],
    };

    const input = buildEmbeddingInput(state);
    const sourceHash = computeSourceHash(input);

    const existing = await getUserEmbeddingByUserId(userId);
    if (existing && existing.source_hash === sourceHash) {
      return;
    }

    const result = await embedText(input);
    if (!result) {
      logger.warn("Embedding job failed: Ollama returned null for user %s", userId);
      return;
    }

    await upsertUserEmbedding(userId, result.embedding, result.modelName, sourceHash);
  } catch (error) {
    logger.error(
      "Embedding job failed for user %s: %s",
      userId,
      error instanceof Error ? error.message : String(error)
    );
  }
}

export function scheduleEmbeddingRegeneration(userId: string): void {
  setImmediate(() => {
    runEmbeddingJob(userId).catch(() => { });
  });
}

export async function checkEmbeddingRegenerationNeeded(userId: string): Promise<boolean> {
  try {
    const [profile, favorites] = await Promise.all([
      getUserProfileAggregateByUserId(userId),
      getFavoritesByUserId(userId),
    ]);

    if (!profile) {
      return false;
    }

    const state = {
      user: profile.user,
      details: profile.details as Parameters<typeof buildEmbeddingInput>[0]["details"],
      favoriteUserIds: favorites ?? [],
    };

    const input = buildEmbeddingInput(state);
    const sourceHash = computeSourceHash(input);
    const existing = await getUserEmbeddingByUserId(userId);

    return !existing || existing.source_hash !== sourceHash;
  } catch {
    return false;
  }
}
