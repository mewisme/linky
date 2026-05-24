import { NextRequest, NextResponse } from "next/server";

import { createVideoFilterPreset, getAdminVideoFilterPresets } from "@/features/admin/api/video-filter-presets";
import type { AdminAPI } from "@/features/admin/types/admin.types";
import { nextResponseFromActionError } from "@/lib/http/action-route-response";
import { searchParamsToActionParams } from "@/lib/http/search-params-to-action-params";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = searchParamsToActionParams(searchParams);
    const data = await getAdminVideoFilterPresets(Object.keys(params).length > 0 ? params : undefined);
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(error, "GET /api/admin/video-filter-presets");
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AdminAPI.VideoFilterPresets.Create.Body;
    const data = await createVideoFilterPreset(body);
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(error, "POST /api/admin/video-filter-presets");
  }
}
