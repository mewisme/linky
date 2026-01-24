import type { CallHistoryRecord, CallHistoryResponse } from "@/types/call-history.types";

export async function getCallHistory(
  token: string | null,
  options: { limit?: number; offset?: number } = {}
): Promise<CallHistoryResponse> {
  const { limit = 50, offset = 0 } = options;
  const res = await fetch(
    `/api/resources/call-history?limit=${limit}&offset=${offset}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(await res.text() || res.statusText);
  return res.json() as Promise<CallHistoryResponse>;
}

export async function getCallHistoryById(
  token: string | null,
  id: string
): Promise<CallHistoryRecord> {
  const res = await fetch(`/api/resources/call-history/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text() || res.statusText);
  return res.json() as Promise<CallHistoryRecord>;
}
