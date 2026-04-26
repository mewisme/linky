import { NextRequest, NextResponse } from "next/server";

import { createInterestTag, getAdminInterestTags } from "@/features/admin/api/interest-tags";
import type { AdminAPI } from "@/features/admin/types/admin.types";
import { nextResponseFromActionError } from "@/lib/http/action-route-response";
import { searchParamsToActionParams } from "@/lib/http/search-params-to-action-params";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = searchParamsToActionParams(searchParams);
    const data = await getAdminInterestTags(Object.keys(params).length > 0 ? params : undefined);
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(error, "GET /api/admin/interest-tags");
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AdminAPI.InterestTags.Create.Body;
    const data = await createInterestTag(body);
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(error, "POST /api/admin/interest-tags");
  }
}
