import { Ollama } from "ollama";
import { config } from "@/config/index.js";
import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";

const logger = createLogger("infra:ollama:embedding:service");

const ollama = new Ollama({
  host: config.ollamaEmbeddingUrl,
});

export interface EmbeddingResult {
  embedding: number[];
  modelName: string;
}

export async function onLoadModel(model: string): Promise<void> {
  await ollama.pull({ model, stream: false });
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

export async function embedText(text: string): Promise<EmbeddingResult | null> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Ollama embedding timed out after ${config.ollamaEmbeddingTimeout}ms`));
    }, config.ollamaEmbeddingTimeout);
  });

  try {
    const response = await Promise.race([
      ollama.embed({ model: config.ollamaEmbeddingModel, input: text }),
      timeoutPromise,
    ]);

    const embeddings = response.embeddings;
    if (!embeddings || embeddings.length === 0) {
      logger.warn("Ollama returned empty embeddings for input");
      return null;
    }

    const embedding = embeddings[0];
    if (!Array.isArray(embedding) || embedding.length === 0) {
      logger.warn("Ollama returned invalid embedding vector");
      return null;
    }

    return {
      embedding,
      modelName: response.model ?? config.ollamaEmbeddingModel,
    };
  } catch (error: unknown) {
    logger.error(toLoggableError(error), "Ollama embedding failed");
    return null;
  }
}
