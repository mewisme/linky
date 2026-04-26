import { NextRequest, NextResponse } from "next/server";

import { syncUserTimezone } from "@/features/user/api/profile";
import { nextResponseFromActionError } from "@/lib/http/action-route-response";

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as { timezone?: string };
    if (!body.timezone?.trim()) {
      return NextResponse.json(
        { error: "Bad Request", message: "timezone is required" },
        { status: 400 },
      );
    }
    await syncUserTimezone(body.timezone.trim());
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return nextResponseFromActionError(error, "PATCH /api/users/timezone");
  }
}
