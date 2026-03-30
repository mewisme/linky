import { describe, expect, it } from "vitest";

import {
  l2Normalize,
  meanPoolEmbeddings,
  validateEmbeddingDimension,
} from "../../../infra/ollama/embedding-vector-pool.js";

describe("meanPoolEmbeddings", () => {
  it("averages and L2-normalizes", () => {
    const a = [3, 4];
    const b = [0, 0];
    const out = meanPoolEmbeddings([a, b]);
    expect(out).not.toBeNull();
    const m = [(3 + 0) / 2, (4 + 0) / 2];
    const n = Math.sqrt(m[0] * m[0] + m[1] * m[1]);
    expect(out).toEqual([m[0] / n, m[1] / n]);
  });

  it("returns null on dimension mismatch", () => {
    expect(meanPoolEmbeddings([[1, 2], [1]])).toBeNull();
  });
});

describe("validateEmbeddingDimension", () => {
  it("accepts when expected is null", () => {
    expect(validateEmbeddingDimension([1, 2], null)).toBe(true);
  });

  it("validates exact length", () => {
    expect(validateEmbeddingDimension(new Array(1024).fill(0), 1024)).toBe(true);
    expect(validateEmbeddingDimension([1, 2], 1024)).toBe(false);
  });
});

describe("l2Normalize", () => {
  it("handles zero vector", () => {
    expect(l2Normalize([0, 0])).toEqual([0, 0]);
  });
});
