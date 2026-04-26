import { NextRequest, NextResponse } from "next/server";

import { blockUser } from "@/features/user/api/blocks";
import { nextResponseFromActionError } from "@/lib/http/action-route-response";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { blocked_user_id?: string };
    if (!body.blocked_user_id?.trim()) {
      return NextResponse.json(
        { error: "Bad Request", message: "blocked_user_id is required" },
        { status: 400 },
      );
    }
    const data = await blockUser(body.blocked_user_id.trim());
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return nextResponseFromActionError(error, "POST /api/users/blocks");
  }
}
