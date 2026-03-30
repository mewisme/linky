import { inspect } from "node:util";

type RecordLike = Record<string, unknown>;

function messageFromRecord(obj: RecordLike): string {
  const message = obj.message;
  const code = obj.code;
  const details = obj.details;
  const hint = obj.hint;
  const parts: string[] = [];
  if (typeof message === "string" && message) parts.push(message);
  if (typeof code === "string" && code) parts.push(`code=${code}`);
  if (typeof details === "string" && details) parts.push(`details=${details}`);
  if (typeof hint === "string" && hint) parts.push(`hint=${hint}`);
  if (parts.length > 0) return parts.join(" | ");
  return inspect(obj, { depth: 6, breakLength: 120 });
}

export function toLoggableError(value: unknown): Error {
  if (value instanceof Error) return value;
  if (value && typeof value === "object") {
    return new Error(messageFromRecord(value as RecordLike));
  }
  if (value === null || value === undefined) {
    return new Error(String(value));
  }
  if (typeof value === "string") return new Error(value);
  return new Error(inspect(value, { depth: 6, breakLength: 120 }));
}
