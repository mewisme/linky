import { beforeEach, describe, expect, it, vi } from "vitest";

import { embedText } from "../../../infra/ollama/embedding.service.js";

const mockOllamaEmbed = vi.fn();

vi.mock("ollama", () => ({
  Ollama: vi.fn().mockImplementation(() => ({
    embed: (...args: unknown[]) => mockOllamaEmbed(...args),
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("embedText", () => {
  it("returns embedding and model name on success", async () => {
    mockOllamaEmbed.mockResolvedValue({
      embeddings: [[0.1, 0.2, 0.3]],
      model: "nomic-embed-text:v1.5",
    });

    const result = await embedText("hello world");

    expect(result).toEqual({
      embedding: [0.1, 0.2, 0.3],
      modelName: "nomic-embed-text:v1.5",
    });
    expect(mockOllamaEmbed).toHaveBeenCalledWith(
      expect.objectContaining({ model: "nomic-embed-text:v1.5", input: "hello world" })
    );
  });

  it("returns null on Ollama error", async () => {
    mockOllamaEmbed.mockRejectedValue(new Error("Ollama unavailable"));

    const result = await embedText("hello");

    expect(result).toBeNull();
  });

  it("returns null when embeddings array is empty", async () => {
    mockOllamaEmbed.mockResolvedValue({ embeddings: [], model: "nomic" });

    const result = await embedText("hello");

    expect(result).toBeNull();
  });

  it("never throws to caller", async () => {
    mockOllamaEmbed.mockRejectedValue(new Error("network error"));

    await expect(embedText("hello")).resolves.toBeNull();
  });
});
