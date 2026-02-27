import { NextRequest, NextResponse } from "next/server";

import { publicEnv } from "@/env/public-env";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authentication token found" },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const queryParams = new URLSearchParams();

    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");
    const unreadOnly = searchParams.get("unread_only");

    if (limit) queryParams.set("limit", limit);
    if (offset) queryParams.set("offset", offset);
    if (unreadOnly) queryParams.set("unread_only", unreadOnly);

    const qs = queryParams.toString();
    const response = await fetch(
      `${publicEnv.API_URL}/api/v1/notifications/me${qs ? `?${qs}` : ""}`,
      {
        method: "GET",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in GET /api/notifications/me:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}
