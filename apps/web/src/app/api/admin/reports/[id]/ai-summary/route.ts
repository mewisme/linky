import { NextRequest, NextResponse } from "next/server";

import { generateAdminReportAiSummary } from "@/features/admin/api/reports";
import { nextResponseFromActionError } from "@/lib/http/action-route-response";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const data = await generateAdminReportAiSummary(id);
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(error, "POST /api/admin/reports/[id]/ai-summary");
  }
}
