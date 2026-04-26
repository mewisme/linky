import { NextRequest, NextResponse } from "next/server";

import { deleteLevelFeatureUnlock, updateLevelFeatureUnlock } from "@/features/admin/api/level-feature-unlocks";
import type { AdminAPI } from "@/features/admin/types/admin.types";
import { nextResponseFromActionError } from "@/lib/http/action-route-response";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const body = (await request.json()) as AdminAPI.LevelFeatureUnlocks.Update.Body;
    const data = await updateLevelFeatureUnlock(id, body);
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(error, "PUT /api/admin/level-feature-unlocks/[id]");
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const data = await deleteLevelFeatureUnlock(id);
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(error, "DELETE /api/admin/level-feature-unlocks/[id]");
  }
}
