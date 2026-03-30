import { Ollama } from "ollama";
import { config } from "@/config/index.js";
import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";

const logger = createLogger("infra:ollama:cloud:service");

const ollama = new Ollama({
  host: config.ollamaCloudUrl,
  headers: {
    Authorization: `Bearer ${config.ollamaCloudApiKey}`,
  }
});

const DEFAULT_TIMEOUT_MS = 45000;
const MAX_RESPONSE_CHARS = 20000;

export async function generateText(prompt: string, options?: { timeoutMs?: number }): Promise<string> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Ollama cloud generate timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  try {
    logger.info("Generating text with model: %s", config.ollamaCloudModel);
    const response = await Promise.race([
      ollama.generate({
        model: config.ollamaCloudModel,
        prompt,
      }),
      timeoutPromise,
    ]);

    const text = response.response ?? "";
    if (!text.trim()) {
      throw new Error("Ollama cloud returned empty response");
    }
    if (text.length > MAX_RESPONSE_CHARS) {
      throw new Error(`Ollama cloud returned oversized response (${text.length} chars)`);
    }

    return text;
  } catch (error: unknown) {
    logger.error(
      toLoggableError(error),
      "Ollama cloud generate failed (model: %s)",
      config.ollamaCloudModel,
    );
    throw error;
  }
}