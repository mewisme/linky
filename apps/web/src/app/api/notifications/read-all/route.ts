import { NextRequest, NextResponse } from "next/server";

import { publicEnv } from "@/env/public-env";
import { trackEventServer } from "@/lib/analytics/events/server";

export async function PATCH(request: NextRequest) {
  trackEventServer({ name: "api_notifications_read_all_patch" });
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authentication token found" },
        { status: 401 }
      );
    }

    const response = await fetch(
      `${publicEnv.API_URL}/api/v1/notifications/read-all`,
      {
        method: "PATCH",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in PATCH /api/notifications/read-all:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to mark all notifications as read" },
      { status: 500 }
    );
  }
}
