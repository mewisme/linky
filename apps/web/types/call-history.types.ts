export interface CallHistoryRecord {
  id: string;
  caller_id: string;
  callee_id: string;
  caller_country: string | null;
  callee_country: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  created_at: string;
  updated_at: string;
  other_user: {
    id: string;
    name: string;
    avatar_url: string | null;
    country: string | null;
  } | null;
  is_caller: boolean;
}

export interface CallHistoryResponse {
  data: CallHistoryRecord[];
  count: number | null;
  limit: number;
  offset: number;
}
