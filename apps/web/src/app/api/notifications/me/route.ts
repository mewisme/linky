import { NextRequest, NextResponse } from "next/server";

import {
  getNotifications,
} from "@/features/notifications/api";
import { nextResponseFromActionError } from "@/lib/http/action-route-response";
import type { ServerActionQueryParams } from "@/lib/http/query-params";

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const params: ServerActionQueryParams = {};
    const limit = sp.get("limit");
    const offset = sp.get("offset");
    const unreadOnly = sp.get("unread_only");
    if (limit !== null) params.limit = limit;
    if (offset !== null) params.offset = offset;
    if (unreadOnly !== null) params.unread_only = unreadOnly;

    const data = await getNotifications(params);
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(error, "GET /api/notifications/me");
  }
}
