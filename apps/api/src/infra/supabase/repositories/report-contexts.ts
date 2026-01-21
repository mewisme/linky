import type { TablesInsert, TablesUpdate } from "../../../types/database/supabase.types.js";

import { createLogger } from "@repo/logger/api";
import { supabase } from "../client.js";

type ReportContextInsert = TablesInsert<"report_contexts">;

const logger = createLogger("API:Supabase:ReportContexts:Repository");

export interface ReportContextWithReport {
  id: string;
  report_id: string;
  call_id: string | null;
  room_id: string | null;
  call_started_at: string | null;
  call_ended_at: string | null;
  duration_seconds: number | null;
  reporter_role: string | null;
  reported_role: string | null;
  ended_by: string | null;
  reported_at_offset_seconds: number | null;
  chat_snapshot: unknown | null;
  behavior_flags: unknown | null;
  created_at: string;
}

export async function createReportContext(
  contextData: Omit<ReportContextInsert, "id" | "created_at">
): Promise<ReportContextInsert> {
  const { data: created, error } = await supabase
    .from("report_contexts")
    .insert(contextData)
    .select()
    .single();

  if (error) {
    logger.error("Error creating report context: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return created;
}

export async function getReportContextByReportId(reportId: string): Promise<ReportContextInsert | null> {
  const { data, error } = await supabase
    .from("report_contexts")
    .select("*")
    .eq("report_id", reportId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    logger.error("Error fetching report context: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return data;
}

export async function getReportWithContext(reportId: string) {
  const { data: report, error: reportError } = await supabase
    .from("reports")
    .select("*")
    .eq("id", reportId)
    .single();

  if (reportError) {
    if (reportError.code === "PGRST116") {
      return null;
    }
    logger.error("Error fetching report: %o", reportError instanceof Error ? reportError : new Error(String(reportError)));
    throw reportError;
  }

  const { data: context, error: contextError } = await supabase
    .from("report_contexts")
    .select("*")
    .eq("report_id", reportId)
    .single();

  if (contextError && contextError.code !== "PGRST116") {
    logger.error("Error fetching report context: %o", contextError instanceof Error ? contextError : new Error(String(contextError)));
    throw new Error(contextError.message);
  }

  return {
    ...report,
    context: context || null,
  };
}

