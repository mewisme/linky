import { describe, expect, it } from "vitest";

import {
  chunkTextForEmbedding,
  dedupeChunksPreserveOrder,
  normalizeWhitespaceForEmbedding,
  prepareEmbeddingChunks,
} from "../../../infra/ollama/embedding-chunking.js";

const baseCfg = {
  maxChunkChars: 1500,
  chunkOverlapChars: 200,
  maxChunksPerJob: 64,
  maxTotalInputCharsPerJob: 50_000,
};

describe("normalizeWhitespaceForEmbedding", () => {
  it("collapses whitespace and trims", () => {
    expect(normalizeWhitespaceForEmbedding("  a \n\n b  \t c  ")).toBe("a b c");
  });
});

describe("dedupeChunksPreserveOrder", () => {
  it("removes duplicates in order", () => {
    expect(dedupeChunksPreserveOrder(["a", "b", "a", "c", "b"])).toEqual(["a", "b", "c"]);
  });
});

describe("chunkTextForEmbedding", () => {
  it("returns empty for blank input", () => {
    const warnings: string[] = [];
    const r = chunkTextForEmbedding("   ", baseCfg, warnings);
    expect(r.chunks).toEqual([]);
    expect(warnings).toEqual([]);
  });

  it("splits long text into bounded chunks", () => {
    const parts: string[] = [];
    for (let i = 0; i < 80; i++) {
      parts.push(`block${i}:${"x".repeat(50)}`);
    }
    const text = parts.join(" ");
    const warnings: string[] = [];
    const { chunks } = chunkTextForEmbedding(
      text,
      {
        maxChunkChars: 1200,
        chunkOverlapChars: 150,
        maxChunksPerJob: 32,
        maxTotalInputCharsPerJob: 100_000,
      },
      warnings,
    );
    expect(chunks.length).toBeGreaterThan(2);
    for (const c of chunks) {
      expect(c.length).toBeLessThanOrEqual(1200);
    }
  });

  it("emits warning when chunk cap reached", () => {
    const parts: string[] = [];
    for (let i = 0; i < 40; i++) {
      parts.push(`line-${i}-${"a".repeat(120)}`);
    }
    const text = parts.join("\n");
    const warnings: string[] = [];
    const { chunks } = chunkTextForEmbedding(
      text,
      { ...baseCfg, maxChunkChars: 500, maxChunksPerJob: 3 },
      warnings,
    );
    expect(chunks.length).toBeLessThanOrEqual(3);
    expect(warnings).toContain("chunk_cap_reached");
  });
});

describe("prepareEmbeddingChunks", () => {
  it("uses fallback chunk for empty semantic text", () => {
    const r = prepareEmbeddingChunks("", baseCfg);
    expect(r.chunks).toEqual(["__linky_empty_profile__"]);
  });
});
