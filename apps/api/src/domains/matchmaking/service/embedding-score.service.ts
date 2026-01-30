import type { EmbeddingPair, EmbeddingScoreConfig, EmbeddingSimilarityResult } from "../types/embedding.types.js";

export const DEFAULT_EMBEDDING_CONFIG: EmbeddingScoreConfig = {
  embeddingWeight: 25,
  minSimilarityThreshold: 0.3,
};

export function calculateCosineSimilarity(embeddingA: number[], embeddingB: number[]): number {
  if (embeddingA.length !== embeddingB.length || embeddingA.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < embeddingA.length; i++) {
    const a = embeddingA[i]!;
    const b = embeddingB[i]!;
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);

  if (magnitude === 0) {
    return 0;
  }

  return dotProduct / magnitude;
}

export function calculateEmbeddingSimilarity(pair: EmbeddingPair): EmbeddingSimilarityResult {
  if (!pair.embeddingA || !pair.embeddingB) {
    return {
      userAId: pair.userAId,
      userBId: pair.userBId,
      similarity: null,
    };
  }

  const similarity = calculateCosineSimilarity(pair.embeddingA, pair.embeddingB);

  return {
    userAId: pair.userAId,
    userBId: pair.userBId,
    similarity,
  };
}

export function calculateEmbeddingScore(
  similarity: number | null,
  config: EmbeddingScoreConfig = DEFAULT_EMBEDDING_CONFIG
): number {
  if (similarity === null || similarity < config.minSimilarityThreshold) {
    return 0;
  }

  return similarity * config.embeddingWeight;
}

export function calculateEmbeddingSimilarities(pairs: EmbeddingPair[]): Map<string, number | null> {
  const result = new Map<string, number | null>();

  for (const pair of pairs) {
    const { userAId, userBId, similarity } = calculateEmbeddingSimilarity(pair);
    const key = createPairKey(userAId, userBId);
    result.set(key, similarity);
  }

  return result;
}

export function createPairKey(userAId: string, userBId: string): string {
  return userAId < userBId ? `${userAId}:${userBId}` : `${userBId}:${userAId}`;
}

export function getEmbeddingSimilarityFromMap(
  map: Map<string, number | null>,
  userAId: string,
  userBId: string
): number | null {
  const key = createPairKey(userAId, userBId);
  return map.get(key) ?? null;
}
