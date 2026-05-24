import { NextRequest, NextResponse } from "next/server";

import { deleteVideoFilterPreset, updateVideoFilterPreset } from "@/features/admin/api/video-filter-presets";
import type { AdminAPI } from "@/features/admin/types/admin.types";
import { nextResponseFromActionError } from "@/lib/http/action-route-response";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const body = (await request.json()) as AdminAPI.VideoFilterPresets.Update.Body;
    const data = await updateVideoFilterPreset(id, body);
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(error, "PUT /api/admin/video-filter-presets/[id]");
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const data = await deleteVideoFilterPreset(id);
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(error, "DELETE /api/admin/video-filter-presets/[id]");
  }
}
