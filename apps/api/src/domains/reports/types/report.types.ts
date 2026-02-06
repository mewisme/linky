import type { TablesInsert, TablesUpdate } from "@/types/database/supabase.types.js";

import type { ReportStatus } from "./report-status.types.js";

export type ReportRecord = TablesInsert<"reports">;
export type ReportUpdate = TablesUpdate<"reports">;

export interface CreateReportBody {
  reported_user_id: string;
  reason: string;
  call_id?: string;
  room_id?: string;
  behavior_flags?: unknown;
}

export interface GetReportsQuery {
  limit?: number;
  offset?: number;
  status?: ReportStatus;
  reporter_user_id?: string;
  reported_user_id?: string;
}

