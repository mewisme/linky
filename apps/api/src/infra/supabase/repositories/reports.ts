import type { TablesInsert, TablesUpdate } from "../../../types/database/supabase.types.js";

import { createLogger } from "@repo/logger";
import { supabase } from "../client.js";

type ReportInsert = TablesInsert<"reports">;
type ReportUpdate = TablesUpdate<"reports">;

const logger = createLogger("API:Supabase:Reports:Repository");

export interface GetReportsOptions {
  limit?: number;
  offset?: number;
  status?: "pending" | "reviewed" | "resolved" | "dismissed";
  reporterUserId?: string;
  reportedUserId?: string;
}

export interface GetReportsResult {
  data: ReportInsert[];
  count: number;
}

export async function getReports(options: GetReportsOptions = {}): Promise<GetReportsResult> {
  const {
    limit = 50,
    offset = 0,
    status,
    reporterUserId,
    reportedUserId,
  } = options;

  let query = supabase
    .from("reports")
    .select("*", { count: "exact" });

  if (status) {
    query = query.eq("status", status);
  }

  if (reporterUserId) {
    query = query.eq("reporter_user_id", reporterUserId);
  }

  if (reportedUserId) {
    query = query.eq("reported_user_id", reportedUserId);
  }

  query = query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    logger.error("Error fetching reports: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return { data: data || [], count: count || 0 };
}

export async function getReportById(id: string) {
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    logger.error("Error fetching report: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return data;
}

export async function createReport(reportData: Omit<ReportInsert, "id" | "created_at" | "updated_at">) {
  const { data: created, error } = await supabase
    .from("reports")
    .insert(reportData)
    .select()
    .single();

  if (error) {
    logger.error("Error creating report: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return created;
}

export async function updateReport(id: string, updateData: ReportUpdate) {
  const { data: updated, error } = await supabase
    .from("reports")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    logger.error("Error updating report: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return updated;
}

export async function getUserReports(userId: string, options: { limit?: number; offset?: number } = {}) {
  const { limit = 50, offset = 0 } = options;

  const { data, error, count } = await supabase
    .from("reports")
    .select("*", { count: "exact" })
    .eq("reporter_user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    logger.error("Error fetching user reports: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return { data: data || [], count: count || 0 };
}

