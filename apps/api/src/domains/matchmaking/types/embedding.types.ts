export interface EmbeddingPair {
  userAId: string;
  userBId: string;
  embeddingA: number[] | null;
  embeddingB: number[] | null;
}

export interface EmbeddingSimilarityResult {
  userAId: string;
  userBId: string;
  similarity: number | null;
}

export interface EmbeddingScoreConfig {
  embeddingWeight: number;
  minSimilarityThreshold: number;
}
