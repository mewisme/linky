export interface GoEmbeddingSyncResponse {
  enqueued: number;
}

export interface GoEmbeddingCompareResponse {
  user_id_a: string;
  user_id_b: string;
  similarity: number;
}

export interface GoEmbeddingSimilarResult {
  user_id: string;
  similarity: number;
}

export interface GoEmbeddingSimilarResponse {
  results: GoEmbeddingSimilarResult[];
}

export interface GoEmbeddingSyncAllResponse {
  scheduled: number;
}
