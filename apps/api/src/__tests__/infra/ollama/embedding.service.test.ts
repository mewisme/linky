import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockOllamaEmbed } = vi.hoisted(() => ({
  mockOllamaEmbed: vi.fn(),
}));

vi.mock("ollama", () => ({
  Ollama: class {
    embed(...args: unknown[]) {
      return mockOllamaEmbed(...args);
    }

    pull() {
      return Promise.resolve({});
    }
  },
}));

vi.mock("../../../config/index.js", () => ({
  config: {
    ollamaEmbeddingUrl: "http://127.0.0.1:11434",
    ollamaEmbeddingModel: "test-embed-model",
    ollamaEmbeddingTimeout: 5000,
    embedMaxChunkChars: 1500,
    embedChunkOverlapChars: 200,
    embedBatchSize: 8,
    embedMaxChunksPerJob: 64,
    embedMaxTotalInputCharsPerJob: 200_000,
    embedExpectedDimension: 3,
    embedOllamaConcurrency: 2,
    embedRetryCount: 0,
    embedRetryBaseDelayMs: 10,
    embedMaxBatchTotalChars: 14_000,
  },
}));

const { embedSemanticProfileText, embedText } = await import(
  "../../../infra/ollama/embedding.service.js"
);

beforeEach(() => {
  vi.clearAllMocks();
  mockOllamaEmbed.mockImplementation((req: { input: string[] }) => ({
    embeddings: req.input.map(() => [1, 0, 0]),
    model: "test-embed-model",
  }));
});

describe("embedSemanticProfileText", () => {
  it("batches bounded input and mean-pools vectors", async () => {
    mockOllamaEmbed.mockImplementationOnce((req: { input: string[] }) => ({
      embeddings: req.input.map((_, i) => (i % 2 === 0 ? ([1, 0, 0] as number[]) : ([0, 1, 0] as number[]))),
      model: "test-embed-model",
    }));

    const result = await embedSemanticProfileText("hello world second line long enough to stay one chunk", {
      userId: "u1",
    });

    expect(result).not.toBeNull();
    expect(result?.embedding.length).toBe(3);
    expect(mockOllamaEmbed).toHaveBeenCalledTimes(1);
    const call = mockOllamaEmbed.mock.calls[0][0] as { input: string[]; truncate?: boolean };
    expect(Array.isArray(call.input)).toBe(true);
    expect(call.input.length).toBe(1);
    expect(call.truncate).toBe(true);
  });

  it("splits into multiple batches when chunk count exceeds batch size", async () => {
    const segments: string[] = [];
    for (let i = 0; i < 100; i++) {
      segments.push(`s${i}:${"z".repeat(180)}`);
    }
    const body = segments.join(" ");

    mockOllamaEmbed.mockImplementation((req: { input: string[] }) => ({
      embeddings: req.input.map(() => [1, 0, 0]),
      model: "test-embed-model",
    }));

    const result = await embedSemanticProfileText(body, {});

    expect(result).not.toBeNull();
    expect(mockOllamaEmbed).toHaveBeenCalledTimes(2);
    const firstCall = mockOllamaEmbed.mock.calls[0][0] as { input: string[] };
    const secondCall = mockOllamaEmbed.mock.calls[1][0] as { input: string[] };
    expect(firstCall.input.length).toBe(8);
    expect(secondCall.input.length).toBeGreaterThanOrEqual(1);
  });

  it("returns null on Ollama error", async () => {
    mockOllamaEmbed.mockRejectedValue(new Error("Ollama unavailable"));

    const result = await embedSemanticProfileText("hello", {});

    expect(result).toBeNull();
  });

  it("returns null when row count mismatches", async () => {
    mockOllamaEmbed.mockResolvedValueOnce({ embeddings: [[1, 0, 0]], model: "m" });

    const result = await embedSemanticProfileText("x".repeat(2000), {});

    expect(result).toBeNull();
  });

  it("never throws to caller", async () => {
    mockOllamaEmbed.mockRejectedValue(new Error("network error"));

    await expect(embedSemanticProfileText("hello")).resolves.toBeNull();
  });
});

describe("embedText", () => {
  it("delegates to semantic pipeline", async () => {
    mockOllamaEmbed.mockImplementationOnce((req: { input: string[] }) => ({
      embeddings: req.input.map(() => [0, 0, 1]),
      model: "test-embed-model",
    }));

    const result = await embedText("hello world");

    expect(result?.embedding).toEqual([0, 0, 1]);
    const call = mockOllamaEmbed.mock.calls[0][0] as { input: string[] };
    expect(call.input).toEqual(["hello world"]);
  });
});
