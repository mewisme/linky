import { NextRequest, NextResponse } from "next/server";

import { nextResponseFromActionError } from "@/lib/http/action-route-response";
import { getPublicVideoFilterPreset, getPublicVideoFilterPresets } from "@/features/admin/api/video-filter-presets-public";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!, 10) : undefined;
    const data = await getPublicVideoFilterPresets(limit, offset);
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(error, "GET /api/resources/video-filter-presets");
  }
}
