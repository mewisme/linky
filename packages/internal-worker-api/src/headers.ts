export const INTERNAL_WORKER_AUTH_HEADER = "authorization" as const;

export const INTERNAL_WORKER_IDEMPOTENCY_HEADER = "idempotency-key" as const;

export function buildInternalWorkerAuthHeaders(
  secret: string,
  extra?: { idempotencyKey?: string; requestId?: string },
): Record<string, string> {
  const headers: Record<string, string> = {
    [INTERNAL_WORKER_AUTH_HEADER]: `Bearer ${secret}`,
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
