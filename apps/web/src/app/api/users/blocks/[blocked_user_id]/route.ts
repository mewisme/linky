import { NextRequest, NextResponse } from "next/server";

import { unblockUser } from "@/features/user/api/blocks";
import { nextResponseFromActionError } from "@/lib/http/action-route-response";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ blocked_user_id: string }> },
) {
  const { blocked_user_id } = await params;
  try {
    if (!blocked_user_id?.trim()) {
      return NextResponse.json(
        { error: "Bad Request", message: "blocked_user_id is required" },
        { status: 400 },
      );
    }
    await unblockUser(blocked_user_id.trim());
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return nextResponseFromActionError(error, "DELETE /api/users/blocks/[blocked_user_id]");
  }
}
