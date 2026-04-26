import { NextRequest, NextResponse } from "next/server";

import { getAdminReport, updateAdminReport } from "@/features/admin/api/reports";
import type { AdminAPI } from "@/features/admin/types/admin.types";
import { nextResponseFromActionError } from "@/lib/http/action-route-response";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const data = await getAdminReport(id);
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(error, "GET /api/admin/reports/[id]");
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const body = (await request.json()) as AdminAPI.Reports.Update.Body;
    const data = await updateAdminReport(id, body);
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(error, "PATCH /api/admin/reports/[id]");
  }
}
