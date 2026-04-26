import { NextRequest, NextResponse } from "next/server";

import { getInterestTags } from "@/actions/resources/interest-tags";
import { nextResponseFromActionError } from "@/lib/http/action-route-response";
import { searchParamsToActionParams } from "@/lib/http/search-params-to-action-params";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = searchParamsToActionParams(searchParams);
    const data = await getInterestTags(Object.keys(params).length > 0 ? params : undefined);
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(error, "GET /api/resources/interest-tags");
  }
}
