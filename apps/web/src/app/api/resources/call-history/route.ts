import { NextRequest, NextResponse } from "next/server";

import { getCallHistory } from "@/actions/resources/call-history";
import type { ResourcesAPI } from "@/shared/types/resources.types";
import { nextResponseFromActionError } from "@/lib/http/action-route-response";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");
    const params: ResourcesAPI.CallHistory.Get.QueryParams = {};
    if (limit != null && limit !== "") params.limit = Number(limit);
    if (offset != null && offset !== "") params.offset = Number(offset);
    const data = await getCallHistory(
      Object.keys(params).length > 0 ? params : undefined,
    );
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(error, "GET /api/resources/call-history");
  }
}
