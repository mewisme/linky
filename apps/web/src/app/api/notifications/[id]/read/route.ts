import { NextResponse } from "next/server";

import { markNotificationRead } from "@/features/notifications/api";
import { nextResponseFromActionError } from "@/lib/http/action-route-response";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    await markNotificationRead(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return nextResponseFromActionError(error, "PATCH /api/notifications/[id]/read");
  }
}
