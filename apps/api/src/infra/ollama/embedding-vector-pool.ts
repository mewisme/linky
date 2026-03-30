export function l2Normalize(vec: number[]): number[] {
  let sumSq = 0;
  for (let i = 0; i < vec.length; i++) {
    const x = vec[i] ?? 0;
    sumSq += x * x;
  }
  const norm = Math.sqrt(sumSq);
  if (norm === 0 || !Number.isFinite(norm)) {
    return vec;
  }
  const out = new Array(vec.length);
  for (let i = 0; i < vec.length; i++) {
    out[i] = (vec[i] ?? 0) / norm;
  }
  return out;
}

export function meanPoolEmbeddings(vectors: number[][]): number[] | null {
  if (vectors.length === 0) {
    return null;
  }
  const first = vectors[0];
  if (!first) {
    return null;
  }
  const dim = first.length;
  if (dim === 0) {
    return null;
  }
  for (const v of vectors) {
    if (v.length !== dim) {
      return null;
    }
  }

  const acc = new Array(dim).fill(0);
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) {
      acc[i] += v[i] ?? 0;
    }
  }
  const n = vectors.length;
  for (let i = 0; i < dim; i++) {
    acc[i] /= n;
  }
  return l2Normalize(acc);
}

export function validateEmbeddingDimension(vector: number[], expected: number | null): boolean {
  if (expected == null || expected <= 0) {
    return vector.length > 0;
  }
  return vector.length === expected;
}
