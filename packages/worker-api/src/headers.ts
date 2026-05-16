export const INTERNAL_WORKER_IDEMPOTENCY_HEADER = "idempotency-key" as const;

export function buildInternalWorkerHeaders(
  extra?: { idempotencyKey?: string; requestId?: string },
): Record<string, string> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (extra?.idempotencyKey) {
    headers[INTERNAL_WORKER_IDEMPOTENCY_HEADER] = extra.idempotencyKey;
  }
  if (extra?.requestId) {
    headers["x-request-id"] = extra.requestId;
  }
  return headers;
}
