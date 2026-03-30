import { Ollama } from "ollama";

import { config } from "@/config/index.js";
import { prepareEmbeddingChunks, type EmbeddingChunkingConfig } from "./embedding-chunking.js";
import {
  meanPoolEmbeddings,
  validateEmbeddingDimension,
} from "./embedding-vector-pool.js";
import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";

const logger = createLogger("infra:ollama:embedding:service");

export interface EmbeddingResult {
  embedding: number[];
  modelName: string;
}

export type EmbedSemanticJobMeta = {
  userId?: string;
  jobLabel?: string;
};

class AsyncConcurrencyLimiter {
  private active = 0;
  private readonly waiters: Array<() => void> = [];

  constructor(private readonly maxConcurrent: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.active >= this.maxConcurrent) {
      await new Promise<void>((resolve) => {
        this.waiters.push(resolve);
      });
    }
    this.active++;
    try {
      return await fn();
    } finally {
      this.active--;
      const next = this.waiters.shift();
      if (next) {
        next();
      }
    }
  }
}

const embeddingCallLimiter = new AsyncConcurrencyLimiter(config.embedOllamaConcurrency);

let ollamaClient: Ollama | null = null;

function getEmbeddingOllama(): Ollama | null {
  const host = config.ollamaEmbeddingUrl?.trim();
  if (!host) {
    return null;
  }
  if (!ollamaClient) {
    ollamaClient = new Ollama({ host });
  }
  return ollamaClient;
}

function isResponseErrorWithStatus(error: unknown): error is Error & { status_code: number } {
  return error instanceof Error && error.name === "ResponseError" && typeof (error as { status_code?: unknown }).status_code === "number";
}

function isTransientOllamaError(error: unknown): boolean {
  if (error instanceof TypeError) {
    const m = error.message.toLowerCase();
    return m.includes("fetch") || m.includes("network") || m.includes("aborted") || m.includes("timeout");
  }
  if (isResponseErrorWithStatus(error)) {
    const c = error.status_code;
    return c === 408 || c === 429 || (c >= 500 && c <= 599);
  }
  const msg = error instanceof Error ? error.message : String(error);
  return /ECONNRESET|ETIMEDOUT|EPIPE|ECONNREFUSED|socket hang up/i.test(msg);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getChunkingConfig(): EmbeddingChunkingConfig {
  return {
    maxChunkChars: config.embedMaxChunkChars,
    chunkOverlapChars: config.embedChunkOverlapChars,
    maxChunksPerJob: config.embedMaxChunksPerJob,
    maxTotalInputCharsPerJob: config.embedMaxTotalInputCharsPerJob,
  };
}

function planBatches(chunks: string[], batchSize: number, maxBatchTotalChars: number): string[][] {
  const batches: string[][] = [];
  let current: string[] = [];
  let batchChars = 0;

  for (const chunk of chunks) {
    const wouldChars = batchChars + chunk.length;
    const wouldCount = current.length + 1;
    if (
      current.length > 0 &&
      (wouldCount > batchSize || wouldChars > maxBatchTotalChars)
    ) {
      batches.push(current);
      current = [];
      batchChars = 0;
    }
    current.push(chunk);
    batchChars += chunk.length;
  }
  if (current.length > 0) {
    batches.push(current);
  }
  return batches;
}

type EmbedBatchOk = { embeddings: number[][]; model: string };

async function callOllamaEmbedBatch(inputs: string[]): Promise<EmbedBatchOk | null> {
  const client = getEmbeddingOllama();
  if (!client) {
    logger.warn({ reason: "missing_ollama_url" }, "Ollama embedding skipped: OLLAMA_EMBEDDING_URL is not set");
    return null;
  }

  const timeoutMs = config.ollamaEmbeddingTimeout;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= config.embedRetryCount; attempt++) {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Ollama embedding timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      const response = await Promise.race([
        client.embed({
          model: config.ollamaEmbeddingModel,
          input: inputs,
          truncate: true,
        }),
        timeoutPromise,
      ]);

      const embeddings = response.embeddings;
      const resolvedModel = response.model ?? config.ollamaEmbeddingModel;
      if (!embeddings || embeddings.length !== inputs.length) {
        logger.warn(
          {
            model: resolvedModel,
            expectedRows: inputs.length,
            gotRows: embeddings?.length ?? 0,
          },
          "Ollama embed response row count mismatch",
        );
        return null;
      }

      for (let i = 0; i < embeddings.length; i++) {
        const row = embeddings[i];
        if (!Array.isArray(row) || row.length === 0) {
          logger.warn(
            { model: resolvedModel, rowIndex: i },
            "Ollama returned invalid embedding row",
          );
          return null;
        }
      }

      return { embeddings, model: resolvedModel };
    } catch (error: unknown) {
      lastError = error;
      const transient = isTransientOllamaError(error);
      if (!transient || attempt >= config.embedRetryCount) {
        logger.error(
          {
            err: toLoggableError(error),
            model: config.ollamaEmbeddingModel,
            batchSize: inputs.length,
            transient,
            attempt,
          },
          "Ollama embedding batch failed",
        );
        return null;
      }
      const delay = config.embedRetryBaseDelayMs * 2 ** attempt;
      logger.warn(
        {
          err: toLoggableError(error),
          model: config.ollamaEmbeddingModel,
          batchSize: inputs.length,
          attempt,
          retryAfterMs: delay,
        },
        "Ollama embedding batch transient error; retrying",
      );
      await sleep(delay);
    }
  }

  logger.error(
    { err: toLoggableError(lastError), model: config.ollamaEmbeddingModel },
    "Ollama embedding exhausted retries",
  );
  return null;
}

export async function onLoadModel(model: string): Promise<void> {
  const client = getEmbeddingOllama();
  if (!client) {
    return;
  }
  await client.pull({ model, stream: false });
}

export async function pullEmbeddingModelAtStartup(): Promise<void> {
  if (!config.ollamaEmbeddingUrl?.trim()) {
    logger.warn("OLLAMA_EMBEDDING_URL is not set; skipping Ollama embedding model pull");
    return;
  }
  try {
    logger.info("Pulling Ollama embedding model if missing: %s", config.ollamaEmbeddingModel);
    await onLoadModel(config.ollamaEmbeddingModel);
    logger.info("Ollama embedding model available: %s", config.ollamaEmbeddingModel);
  } catch (error: unknown) {
    logger.error(
      toLoggableError(error),
      "Failed to pull Ollama embedding model; embedding calls may fail until the model exists locally",
    );
  }
}

async function embedChunkBatchesInternal(
  chunks: string[],
  meta: EmbedSemanticJobMeta,
): Promise<EmbeddingResult | null> {
  if (chunks.length === 0) {
    return null;
  }

  const batchSize = config.embedBatchSize;
  const batches = planBatches(chunks, batchSize, config.embedMaxBatchTotalChars);
  const pooledVectors: number[][] = [];
  let resolvedModelName = config.ollamaEmbeddingModel;

  let batchIndex = 0;
  for (const batch of batches) {
    const t0 = Date.now();
    const totalChars = batch.reduce((s, c) => s + c.length, 0);

    const batchResult = await embeddingCallLimiter.run(() => callOllamaEmbedBatch(batch));
    const elapsedMs = Date.now() - t0;

    if (!batchResult) {
      logger.warn(
        {
          userId: meta.userId ?? null,
          jobLabel: meta.jobLabel ?? null,
          model: config.ollamaEmbeddingModel,
          batchIndex,
          batchCount: batches.length,
          batchChunkCount: batch.length,
          batchTotalChars: totalChars,
          durationMs: elapsedMs,
        },
        "Ollama embedding batch failed",
      );
      return null;
    }

    logger.info(
      {
        userId: meta.userId ?? null,
        jobLabel: meta.jobLabel ?? null,
        model: batchResult.model,
        batchIndex,
        batchCount: batches.length,
        batchChunkCount: batch.length,
        batchTotalChars: totalChars,
        durationMs: elapsedMs,
      },
      "Ollama embedding batch ok",
    );
    resolvedModelName = batchResult.model;
    for (const v of batchResult.embeddings) {
      pooledVectors.push(v);
    }
    batchIndex++;
  }

  const embedding = meanPoolEmbeddings(pooledVectors);
  if (!embedding) {
    logger.warn({ userId: meta.userId ?? null }, "Mean-pool produced empty embedding");
    return null;
  }

  const expectedDim = config.embedExpectedDimension;
  if (!validateEmbeddingDimension(embedding, expectedDim)) {
    logger.warn(
      {
        userId: meta.userId ?? null,
        model: resolvedModelName,
        dimension: embedding.length,
        expectedDimension: expectedDim,
      },
      "Embedding dimension mismatch; refusing to persist",
    );
    return null;
  }

  return {
    embedding,
    modelName: resolvedModelName,
  };
}

export async function embedSemanticProfileText(
  semanticText: string,
  meta: EmbedSemanticJobMeta = {},
): Promise<EmbeddingResult | null> {
  const jobStarted = Date.now();
  const chunkCfg = getChunkingConfig();
  const {
    chunks,
    warnings,
    preDedupeChunkCount,
    afterDedupeChunkCount,
  } = prepareEmbeddingChunks(semanticText, chunkCfg);

  const finalChunkCount = chunks.length;

  logger.info(
    {
      userId: meta.userId ?? null,
      jobLabel: meta.jobLabel ?? null,
      model: config.ollamaEmbeddingModel,
      sourceTextChars: semanticText.length,
      rawSliceChunkCount: preDedupeChunkCount,
      chunksAfterDedupe: afterDedupeChunkCount,
      chunksAfterCaps: finalChunkCount,
      chunkingWarnings: warnings.length > 0 ? warnings : undefined,
      maxChunkChars: chunkCfg.maxChunkChars,
      batchSize: config.embedBatchSize,
    },
    "Embedding job chunking complete",
  );

  try {
    const result = await embedChunkBatchesInternal(chunks, meta);
    const totalDurationMs = Date.now() - jobStarted;

    if (result) {
      logger.info(
        {
          userId: meta.userId ?? null,
          jobLabel: meta.jobLabel ?? null,
          model: result.modelName,
          chunksAfterCaps: finalChunkCount,
          embeddingDim: result.embedding.length,
          totalDurationMs,
        },
        "Embedding job finished",
      );
    } else {
      logger.warn(
        {
          userId: meta.userId ?? null,
          jobLabel: meta.jobLabel ?? null,
          model: config.ollamaEmbeddingModel,
          chunksAfterCaps: finalChunkCount,
          totalDurationMs,
        },
        "Embedding job failed or returned no vector",
      );
    }

    return result;
  } catch (error: unknown) {
    logger.error(
      { err: toLoggableError(error), userId: meta.userId ?? null },
      "Embedding job unexpected error",
    );
    return null;
  }
}

export async function embedText(text: string): Promise<EmbeddingResult | null> {
  return embedSemanticProfileText(text, { jobLabel: "legacy_embedText" });
}
