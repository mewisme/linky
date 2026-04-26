import { NextResponse } from "next/server";

import { markAllNotificationsRead } from "@/features/notifications/api";
import { nextResponseFromActionError } from "@/lib/http/action-route-response";

export async function PATCH() {
  try {
    await markAllNotificationsRead();
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return nextResponseFromActionError(error, "PATCH /api/notifications/read-all");
  }
}
