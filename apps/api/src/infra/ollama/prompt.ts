export const REPORT_SUMMARY_PROMPT_VERSION = "report-summary-v1";

export type ReportSummarySeverity = "low" | "medium" | "high" | "critical";

export interface ReportSummaryModelOutput {
  summary: string;
  severity: ReportSummarySeverity;
  suggested_action: string;
}

function clipText(input: string, maxChars: number): string {
  if (input.length <= maxChars) return input;
  return `${input.slice(0, maxChars)}…`;
}

export function buildReportSummaryPrompt(params: {
  reportReason: string;
  contextJson: unknown | null;
}): string {
  const reason = clipText(params.reportReason.trim(), 1200);
  const context = params.contextJson ? clipText(JSON.stringify(params.contextJson), 8000) : "";

  return [
    `You are an internal moderation assistant for a real-time video chat app.`,
    `Your job is to summarize a user report for admins. Do not invent details.`,
    ``,
    `Output rules (strict):`,
    `- Output ONLY valid JSON. No markdown, no explanations.`,
    `- JSON schema must be exactly: {"summary": string, "severity": "low"|"medium"|"high"|"critical", "suggested_action": string}`,
    `- Keep "summary" <= 240 characters.`,
    `- "suggested_action" should be concrete and admin-friendly (e.g., "Review chat snapshot", "Warn user", "Escalate to superadmin").`,
    `- If evidence is weak or context is missing, choose a lower severity and mention missing context briefly in summary.`,
    ``,
    `Inputs:`,
    `report_reason: ${JSON.stringify(reason)}`,
    `report_context_json: ${context ? context : "null"}`,
  ].join("\n");
}