import axios from "axios";
import type { CallHistoryRecord, CallHistoryResponse } from "@/types/call-history.types";

export async function getCallHistory(
  token: string | null,
  options: { limit?: number; offset?: number } = {}
): Promise<CallHistoryResponse> {
  const { limit = 50, offset = 0 } = options;

  const response = await axios.get<CallHistoryResponse>(
    "/api/resources/call-history",
    {
      params: { limit, offset },
      headers: {
        Authorization: `Bearer ${token}`,
      },
      baseURL: typeof window !== "undefined" ? window.location.origin : undefined,
    }
  );

  return response.data;
}

export async function getCallHistoryById(
  token: string | null,
  id: string
): Promise<CallHistoryRecord> {
  const response = await axios.get<CallHistoryRecord>(
    `/api/resources/call-history/${id}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      baseURL: typeof window !== "undefined" ? window.location.origin : undefined,
    }
  );

  return response.data;
}
