import type { TablesInsert, TablesUpdate } from "@/types/database/supabase.types.js";
import { createLogger } from "@/utils/logger.js";
import { supabase } from "@/infra/supabase/client.js";

type ReportAiSummaryInsert = TablesInsert<"report_ai_summaries">;
type ReportAiSummaryUpdate = TablesUpdate<"report_ai_summaries">;

const logger = createLogger("infra:supabase:repositories:report-ai-summaries");

export async function getReportAiSummaryByReportId(reportId: string): Promise<ReportAiSummaryInsert | null> {
  const { data, error } = await supabase
    .from("report_ai_summaries")
    .select("*")
    .eq("report_id", reportId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    logger.error(error as Error, "Error fetching report AI summary");
    throw error;
  }

  return data;
}

export async function upsertReportAiSummary(
  row: ReportAiSummaryInsert,
): Promise<ReportAiSummaryInsert> {
  const { data, error } = await supabase
    .from("report_ai_summaries")
    .upsert(row, { onConflict: "report_id" })
    .select()
    .single();

  if (error) {
    logger.error(error as Error, "Error upserting report AI summary");
    throw error;
  }

  return data;
}

export async function updateReportAiSummary(
  reportId: string,
  update: ReportAiSummaryUpdate,
): Promise<ReportAiSummaryInsert> {
  const { data, error } = await supabase
    .from("report_ai_summaries")
    .update(update)
    .eq("report_id", reportId)
    .select()
    .single();

  if (error) {
    logger.error(error as Error, "Error updating report AI summary");
    throw error;
  }

  return data;
}

