import { NextResponse } from "next/server";

import { getUnreadCount } from "@/features/notifications/api";
import { nextResponseFromActionError } from "@/lib/http/action-route-response";

export async function GET() {
  try {
    const data = await getUnreadCount();
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(error, "GET /api/notifications/me/unread-count");
  }
}
