import { Ollama } from "ollama";
import { config } from "@/config/index.js";
import { createLogger } from "@/utils/logger.js";

const logger = createLogger("infra:ollama:embedding:service");
const EMBEDDING_MODEL = "nomic-embed-text:v1.5";

const ollama = new Ollama({
  host: config.ollamaUrl,
});

export interface EmbeddingResult {
  embedding: number[];
  modelName: string;
}

export async function embedText(text: string): Promise<EmbeddingResult | null> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Ollama embedding timed out after ${config.ollamaEmbeddingTimeout}ms`));
    }, config.ollamaEmbeddingTimeout);
  });

  try {
    const response = await Promise.race([
      ollama.embed({ model: EMBEDDING_MODEL, input: text }),
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
      modelName: response.model ?? EMBEDDING_MODEL,
    };
  } catch (error) {
    logger.error(
      "Ollama embedding failed: %s",
      error instanceof Error ? error.message : String(error)
    );
    return null;
  }
}
