export type ReportAiSummaryStatus = "pending" | "ready" | "failed";

export type ReportAiSummarySeverity = "low" | "medium" | "high" | "critical";

export interface ReportAiSummaryRecord {
  report_id: string;
  status: ReportAiSummaryStatus;
  summary: string | null;
  severity: ReportAiSummarySeverity | null;
  suggested_action: string | null;
  model: string | null;
  prompt_version: string | null;
  raw_json: unknown | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

