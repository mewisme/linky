export function formatExpAbbrev(exp: number): string {
  if (exp >= 1_000_000) {
    return `${(exp / 1_000_000).toFixed(1)}M`;
  }
  if (exp >= 1000) {
    return `${(exp / 1000).toFixed(1)}k`;
  }
  return exp.toString();
}

export function formatExpDetail(exp: number): string {
  return exp.toLocaleString();
}

export function isExpAbbreviated(exp: number): boolean {
  return exp >= 1000;
}
