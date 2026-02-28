import { getUserEmbeddingByUserId, upsertUserEmbedding } from "@/infra/supabase/repositories/user-embeddings.js";

import { buildEmbeddingInput, type SemanticProfileInput } from "./embedding-input.builder.js";
import { createHash } from "node:crypto";
import { createLogger } from "@/utils/logger.js";
import { embedText } from "@/infra/ollama/embedding.service.js";
import { getUserProfileAggregateByUserId } from "./user-profile.service.js";

const logger = createLogger("api:user:embedding-job:service");

function computeSourceHash(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

function extractInterestTagNames(interestTags: unknown): string[] {
  if (!Array.isArray(interestTags)) {
    return [];
  }
  const names: string[] = [];
  for (const item of interestTags) {
    if (item && typeof item === "object" && "name" in item && typeof (item as { name: unknown }).name === "string") {
      names.push((item as { name: string }).name);
    }
  }
  return names;
}

function toSemanticProfile(profile: { user: unknown; details: unknown; settings: unknown } | null): SemanticProfileInput {
  if (!profile?.details || typeof profile.details !== "object") {
    return { bio: null, interest_tag_names: [], gender: null, date_of_birth: null };
  }
  const d = profile.details as { bio?: unknown; gender?: unknown; date_of_birth?: unknown; interest_tags?: unknown };
  return {
    bio: typeof d.bio === "string" ? d.bio : null,
    gender: typeof d.gender === "string" ? d.gender : null,
    date_of_birth: typeof d.date_of_birth === "string" ? d.date_of_birth : null,
    interest_tag_names: extractInterestTagNames(d.interest_tags),
  };
}

async function runEmbeddingJob(userId: string): Promise<void> {
  try {
    const profile = await getUserProfileAggregateByUserId(userId);

    if (!profile?.user) {
      logger.warn("Embedding job skipped: profile not found for user %s", userId);
      return;
    }

    const semanticProfile = toSemanticProfile(profile);
    const input = buildEmbeddingInput(semanticProfile);
    const sourceHash = computeSourceHash(input);

    const existing = await getUserEmbeddingByUserId(userId);
    if (existing && existing.source_hash === sourceHash) {
      return;
    }

    const result = await embedText(input || " ");
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
    const profile = await getUserProfileAggregateByUserId(userId);

    if (!profile?.user) {
      return false;
    }

    const semanticProfile = toSemanticProfile(profile);
    const input = buildEmbeddingInput(semanticProfile);
    const sourceHash = computeSourceHash(input);
    const existing = await getUserEmbeddingByUserId(userId);

    return !existing || existing.source_hash !== sourceHash;
  } catch {
    return false;
  }
}
