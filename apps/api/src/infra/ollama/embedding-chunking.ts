export type EmbeddingChunkingConfig = {
  maxChunkChars: number;
  chunkOverlapChars: number;
  maxChunksPerJob: number;
  maxTotalInputCharsPerJob: number;
};

export const EMBEDDING_EMPTY_PROFILE_FALLBACK = "__linky_empty_profile__";

export function normalizeWhitespaceForEmbedding(text: string): string {
  if (text == null || typeof text !== "string") {
    return "";
  }
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[\t\u000b\f\u0085\u2028\u2029]+/g, " ")
    .replace(/\n+/g, " ")
    .replace(/ +/g, " ")
    .trim();
}

export function dedupeChunksPreserveOrder(chunks: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of chunks) {
    if (seen.has(c)) {
      continue;
    }
    seen.add(c);
    out.push(c);
  }
  return out;
}

export function chunkTextForEmbedding(
  text: string,
  cfg: EmbeddingChunkingConfig,
  warnings: string[],
): {
  chunks: string[];
  preDedupeChunkCount: number;
  afterDedupeChunkCount: number;
} {
  const normalized = normalizeWhitespaceForEmbedding(text);
  if (!normalized) {
    return { chunks: [], preDedupeChunkCount: 0, afterDedupeChunkCount: 0 };
  }

  const maxLen = Math.max(32, cfg.maxChunkChars);
  const overlap = Math.min(Math.max(0, cfg.chunkOverlapChars), maxLen - 1);

  const rawChunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    const end = Math.min(start + maxLen, normalized.length);
    const slice = normalized.slice(start, end).trim();
    if (slice.length > 0) {
      rawChunks.push(slice);
    }
    if (end >= normalized.length) {
      break;
    }
    const nextStart = Math.max(end - overlap, start + 1);
    start = nextStart;
  }

  const preCapDedupeCount = rawChunks.length;
  const deduped = dedupeChunksPreserveOrder(rawChunks);
  const afterDedupeCount = deduped.length;

  let totalChars = 0;
  const out: string[] = [];
  for (const c of deduped) {
    if (out.length >= cfg.maxChunksPerJob) {
      warnings.push("chunk_cap_reached");
      break;
    }
    if (totalChars + c.length > cfg.maxTotalInputCharsPerJob) {
      warnings.push("total_input_char_cap_reached");
      break;
    }
    totalChars += c.length;
    out.push(c);
  }

  return { chunks: out, preDedupeChunkCount: preCapDedupeCount, afterDedupeChunkCount: afterDedupeCount };
}

export type PreparedChunksResult = {
  chunks: string[];
  warnings: string[];
  preDedupeChunkCount: number;
  afterDedupeChunkCount: number;
};

export function prepareEmbeddingChunks(
  semanticText: string,
  cfg: EmbeddingChunkingConfig,
): PreparedChunksResult {
  const warnings: string[] = [];
  const { chunks, preDedupeChunkCount, afterDedupeChunkCount } = chunkTextForEmbedding(semanticText, cfg, warnings);
  if (chunks.length === 0) {
    return {
      chunks: [EMBEDDING_EMPTY_PROFILE_FALLBACK],
      warnings,
      preDedupeChunkCount: 0,
      afterDedupeChunkCount: 0,
    };
  }
  return {
    chunks,
    warnings,
    preDedupeChunkCount,
    afterDedupeChunkCount,
  };
}
