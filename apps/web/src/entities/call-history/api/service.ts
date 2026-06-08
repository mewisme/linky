import type { CallHistoryRecord, CallHistoryResponse } from "@/entities/call-history/types/call-history.types";
import { readJsonOrThrowApiError } from "@/lib/http/api-error";

export async function getCallHistory(
  token: string | null,
  options: { limit?: number; offset?: number } = {}
): Promise<CallHistoryResponse> {
  const { limit = 50, offset = 0 } = options;
  const res = await fetch(
    `/api/resources/call-history?limit=${limit}&offset=${offset}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return readJsonOrThrowApiError<CallHistoryResponse>(res);
}

export async function getCallHistoryById(
  token: string | null,
  id: string
): Promise<CallHistoryRecord> {
  const res = await fetch(`/api/resources/call-history/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJsonOrThrowApiError<CallHistoryRecord>(res);
}
