import { getUserEmbeddingByUserId, upsertUserEmbedding } from "@/infra/supabase/repositories/user-embeddings.js";

import { config } from "@/config/index.js";
import { tryEnqueueAsyncJob } from "@/jobs/job-queue.js";
import { buildEmbeddingInput, type SemanticProfileInput } from "./embedding-input.builder.js";
import { createHash } from "node:crypto";
import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";
import { embedSemanticProfileText } from "@/infra/ollama/embedding.service.js";
import { getUserProfileAggregateByUserId } from "./user-profile.service.js";

const logger = createLogger("api:user:embedding-job:service");

function hasNonNullEmbedding(embedding: unknown): boolean {
  if (embedding == null) return false;
  if (typeof embedding === "string") {
    const t = embedding.trim();
    if (t === "" || t === "null") return false;
    try {
      const parsed = JSON.parse(t) as unknown;
      if (Array.isArray(parsed)) return parsed.length > 0;
    } catch {
      return t.length > 0;
    }
    return false;
  }
  if (Array.isArray(embedding)) return embedding.length > 0;
  return false;
}

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
  const jobStarted = Date.now();
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
    const modelMatches =
      existing?.model_name != null && existing.model_name === config.ollamaEmbeddingModel;
    if (
      existing &&
      existing.source_hash === sourceHash &&
      hasNonNullEmbedding(existing.embedding) &&
      modelMatches
    ) {
      return;
    }

    logger.info({ userId, sourceTextChars: input.length }, "User embedding job started");

    const result = await embedSemanticProfileText(input, { userId, jobLabel: "user_profile" });
    if (!result) {
      logger.warn(
        { userId, durationMs: Date.now() - jobStarted },
        "Embedding job failed: Ollama returned null for user",
      );
      return;
    }

    await upsertUserEmbedding(userId, result.embedding, result.modelName, sourceHash);
    logger.info(
      {
        userId,
        model: result.modelName,
        durationMs: Date.now() - jobStarted,
      },
      "User embedding job persisted",
    );
  } catch (error: unknown) {
    logger.error(toLoggableError(error), "Embedding job failed for user %s", userId);
  }
}

export async function runUserEmbeddingRegenerationJob(userId: string): Promise<void> {
  await runEmbeddingJob(userId);
}

export function scheduleEmbeddingRegeneration(userId: string): void {
  void (async () => {
    const enqueued = await tryEnqueueAsyncJob({
      v: 1,
      type: "user_embedding_regenerate",
      payload: { userId },
    });
    if (!enqueued) {
      setImmediate(() => {
        runEmbeddingJob(userId).catch(() => {});
      });
    }
  })();
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

    if (!existing) {
      return true;
    }
    if (!hasNonNullEmbedding(existing.embedding)) {
      return true;
    }
    if (existing.model_name !== config.ollamaEmbeddingModel) {
      return true;
    }
    return existing.source_hash !== sourceHash;
  } catch {
    return false;
  }
}
