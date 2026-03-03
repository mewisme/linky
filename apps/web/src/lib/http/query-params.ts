export type ServerActionQueryParams = Record<string, string | number | boolean | undefined>;

export function toURLSearchParams(params?: ServerActionQueryParams): URLSearchParams | undefined {
  if (!params || Object.keys(params).length === 0) return undefined;
  const entries = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => [k, String(v)] as [string, string]);
  if (entries.length === 0) return undefined;
  return new URLSearchParams(entries);
}
