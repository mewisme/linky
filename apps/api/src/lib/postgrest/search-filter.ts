const POSTGREST_SEARCH_UNSAFE = /[,().":\\]/;

export class InvalidPostgrestSearchError extends Error {
  override readonly name = "InvalidPostgrestSearchError";
}

export function isSafePostgrestSearchTerm(term: string): boolean {
  return !POSTGREST_SEARCH_UNSAFE.test(term);
}

function escapeIlikePattern(term: string): string {
  return term.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export function buildPostgrestOrIlikeFilters(columns: readonly string[], search: string): string {
  if (!isSafePostgrestSearchTerm(search)) {
    throw new InvalidPostgrestSearchError();
  }

  const escaped = escapeIlikePattern(search);
  return columns.map((col) => `${col}.ilike.%${escaped}%`).join(",");
}
