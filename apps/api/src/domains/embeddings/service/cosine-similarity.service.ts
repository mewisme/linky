export function isValidVector(v: unknown): v is number[] {
  if (!Array.isArray(v)) return false;
  return v.length > 0 && v.every((x) => typeof x === "number" && !Number.isNaN(x));
}

export function cosineSimilarity(a: number[], b: number[]): number | null {
  if (!isValidVector(a) || !isValidVector(b)) return null;
  if (a.length !== b.length) return null;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const va = a[i]!;
    const vb = b[i]!;
    dotProduct += va * vb;
    normA += va * va;
    normB += vb * vb;
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) return 0;

  const raw = dotProduct / magnitude;
  return Math.max(-1, Math.min(1, raw));
}
