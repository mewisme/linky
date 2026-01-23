import { createHash } from "crypto";

const HASH_HEX_LENGTH = 16;

function stableValue(value: unknown): unknown {
  if (value === null) return null;
  if (Array.isArray(value)) return value.map(stableValue);
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "object") return value;

  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    const v = obj[key];
    if (v === undefined) continue;
    out[key] = stableValue(v);
  }
  return out;
}

export function hashFilters(filters: unknown): string {
  const normalized = stableValue(filters);
  const json = JSON.stringify(normalized);
  return createHash("sha256").update(json).digest("hex").slice(0, HASH_HEX_LENGTH);
}

