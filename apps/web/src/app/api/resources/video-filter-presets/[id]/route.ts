import { NextRequest, NextResponse } from "next/server";

import { nextResponseFromActionError } from "@/lib/http/action-route-response";
import { getPublicVideoFilterPreset } from "@/features/admin/api/video-filter-presets-public";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const data = await getPublicVideoFilterPreset(id);
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(error, "GET /api/resources/video-filter-presets/[id]");
  }
}
