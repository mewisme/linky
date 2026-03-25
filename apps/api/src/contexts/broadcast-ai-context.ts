import { createLogger } from "@/utils/logger.js";
import { generateText } from "@/infra/ollama/cloud.service.js";
import { buildBroadcastAiDraftPrompt, BROADCAST_AI_PROMPT_VERSION, type BroadcastAiTone, type BroadcastAiDraftOutput } from "@/infra/ollama/prompt.js";
import { redisClient } from "@/infra/redis/client.js";
import { withRedisTimeout } from "@/infra/redis/timeout-wrapper.js";
import { config } from "@/config/index.js";
import { hashFilters } from "@/infra/redis/cache/hash.js";

const logger = createLogger("context:broadcast-ai");

const LOCK_TTL_SECONDS = 60;
const CACHE_TTL_SECONDS = 30 * 60;

function normalizeText(input: string, maxChars: number): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (trimmed.length <= maxChars) return trimmed;
  return `${trimmed.slice(0, maxChars)}…`;
}

function safeParseJsonObject(input: string): unknown | null {
  const trimmed = input.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    return null;
  }
}

function isTone(value: unknown): value is BroadcastAiTone {
  return value === "friendly" || value === "professional" || value === "direct";
}

function validateBroadcastAiDraftOutput(input: unknown): BroadcastAiDraftOutput | null {
  if (!input || typeof input !== "object") return null;
  const obj = input as Record<string, unknown>;

  const primary = obj.primary;
  if (!primary || typeof primary !== "object") return null;
  const primaryObj = primary as Record<string, unknown>;
  if (
    typeof primaryObj.title !== "string" ||
    typeof primaryObj.body !== "string" ||
    typeof primaryObj.cta !== "string"
  ) {
    return null;
  }

  const toneVariants = obj.tone_variants;
  if (!Array.isArray(toneVariants)) return null;
  const variants = toneVariants as unknown[];

  if (variants.length !== 3) return null;

  const parsedVariants: BroadcastAiDraftOutput["tone_variants"] = [];
  for (const v of variants) {
    if (!v || typeof v !== "object") return null;
    const vObj = v as Record<string, unknown>;
    if (!isTone(vObj.tone)) return null;
    if (typeof vObj.title !== "string" || typeof vObj.body !== "string" || typeof vObj.cta !== "string") return null;
    parsedVariants.push({
      tone: vObj.tone,
      title: vObj.title,
      body: vObj.body,
      cta: vObj.cta,
    });
  }

  const tones = new Set(parsedVariants.map((x) => x.tone));
  if (tones.size !== 3) return null;

  return {
    primary: {
      title: primaryObj.title,
      body: primaryObj.body,
      cta: primaryObj.cta,
    },
    tone_variants: parsedVariants,
  };
}

export interface GenerateBroadcastAiDraftParams {
  audience: string;
  keyPoints: string;
  createdByUserId: string;
}

export async function generateBroadcastAiDraft(params: GenerateBroadcastAiDraftParams): Promise<BroadcastAiDraftOutput> {
  const audience = normalizeText(params.audience, 400);
  const keyPoints = normalizeText(params.keyPoints, 1400);

  const dedupeHash = hashFilters({
    audience,
    keyPoints,
    promptVersion: BROADCAST_AI_PROMPT_VERSION,
    model: config.ollamaCloudModel,
  });

  const cacheKey = `ai:broadcast:draft:${dedupeHash}`;
  const lockKey = `ai:broadcast:lock:${params.createdByUserId}:${dedupeHash}`;

  if (redisClient.isOpen) {
    const cached = await withRedisTimeout(async () => await redisClient.get(cacheKey), "broadcast-ai-cache-get");
    if (cached) {
      const parsed = safeParseJsonObject(cached);
      const validated = validateBroadcastAiDraftOutput(parsed);
      if (validated) return validated;
    }
  }

  if (!redisClient.isOpen) {
    const prompt = buildBroadcastAiDraftPrompt({ audience, keyPoints });
    const text = await generateText(prompt, { timeoutMs: 45000 });
    const parsed = safeParseJsonObject(text);
    const validated = validateBroadcastAiDraftOutput(parsed);
    if (!validated) throw new Error("Invalid model output for broadcast AI draft");
    return validated;
  }

  const lockOk = await withRedisTimeout(
    async () => await redisClient.set(lockKey, "1", { NX: true, EX: LOCK_TTL_SECONDS }),
    "broadcast-ai-lock-set",
  );

  if (lockOk !== "OK") {
    throw new Error("Broadcast AI generation already in progress. Please retry shortly.");
  }

  try {
    const prompt = buildBroadcastAiDraftPrompt({ audience, keyPoints });
    const text = await generateText(prompt, { timeoutMs: 45000 });
    const parsed = safeParseJsonObject(text);
    const validated = validateBroadcastAiDraftOutput(parsed);
    if (!validated) throw new Error("Invalid model output for broadcast AI draft");

    await withRedisTimeout(
      async () => {
        await redisClient.set(cacheKey, JSON.stringify(validated), { EX: CACHE_TTL_SECONDS });
      },
      "broadcast-ai-cache-set",
    );

    return validated;
  } finally {
    if (redisClient.isOpen) {
      await withRedisTimeout(async () => await redisClient.del(lockKey), "broadcast-ai-lock-del").catch(() => undefined);
    }
  }
}

