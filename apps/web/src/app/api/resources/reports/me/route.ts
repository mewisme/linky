import { NextRequest, NextResponse } from "next/server";

import { getMyReports } from "@/actions/resources/reports";
import type { ResourcesAPI } from "@/shared/types/resources.types";
import { nextResponseFromActionError } from "@/lib/http/action-route-response";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");
    const params: ResourcesAPI.Reports.GetMe.QueryParams = {};
    if (limit != null && limit !== "") params.limit = Number(limit);
    if (offset != null && offset !== "") params.offset = Number(offset);
    const data = await getMyReports(
      Object.keys(params).length > 0 ? params : undefined,
    );
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(error, "GET /api/resources/reports/me");
  }
}
