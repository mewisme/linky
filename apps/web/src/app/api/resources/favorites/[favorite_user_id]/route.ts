import { NextRequest, NextResponse } from "next/server";

import { removeFavorite } from "@/actions/resources/favorites";
import { nextResponseFromActionError } from "@/lib/http/action-route-response";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ favorite_user_id: string }> },
) {
  const { favorite_user_id } = await params;
  try {
    if (!favorite_user_id?.trim()) {
      return NextResponse.json(
        { error: "Bad Request", message: "favorite_user_id is required" },
        { status: 400 },
      );
    }
    const data = await removeFavorite(favorite_user_id.trim());
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(error, "DELETE /api/resources/favorites/[favorite_user_id]");
  }
}
