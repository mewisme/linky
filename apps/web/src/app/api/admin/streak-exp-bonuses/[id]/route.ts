import { NextRequest, NextResponse } from "next/server";

import { deleteStreakExpBonus, updateStreakExpBonus } from "@/features/admin/api/streak-exp-bonuses";
import type { AdminAPI } from "@/features/admin/types/admin.types";
import { nextResponseFromActionError } from "@/lib/http/action-route-response";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const body = (await request.json()) as AdminAPI.StreakExpBonuses.Update.Body;
    const data = await updateStreakExpBonus(id, body);
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(error, "PUT /api/admin/streak-exp-bonuses/[id]");
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const data = await deleteStreakExpBonus(id);
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(error, "DELETE /api/admin/streak-exp-bonuses/[id]");
  }
}
