import { NextRequest, NextResponse } from "next/server";

import {
  deleteExpBonus,
  updateExpBonus,
} from "@/features/admin/api/exp-bonuses";
import type { AdminAPI } from "@/features/admin/types/admin.types";
import { nextResponseFromActionError } from "@/lib/http/action-route-response";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const body = (await request.json()) as AdminAPI.ExpBonuses.Update.Body;
    const data = await updateExpBonus(id, body);
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(
      error,
      "PUT /api/admin/exp-bonuses/[id]",
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const data = await deleteExpBonus(id);
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(
      error,
      "DELETE /api/admin/exp-bonuses/[id]",
    );
  }
}
