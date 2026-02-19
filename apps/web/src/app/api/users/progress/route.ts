import { NextRequest, NextResponse } from "next/server";

import type { ApiError } from "@/types/api.types";
import type { UsersAPI } from "@/types/users.types";
import { publicEnv } from "@/env/public-env";
import { trackEventServer } from "@/lib/analytics/events/server";

export async function GET(request: NextRequest) {
  trackEventServer({ name: "api_users_progress_get" });
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authentication token found" },
        { status: 401 }
      );
    }

    const timezone = request.headers.get("x-user-timezone") ?? request.nextUrl.searchParams.get("timezone");

    const headers: Record<string, string> = {
      Authorization: authHeader,
      "Content-Type": "application/json",
    };
    if (timezone) {
      headers["x-user-timezone"] = timezone;
    }

    const response = await fetch(`${publicEnv.API_URL}/api/v1/user-progress/me`, {
      method: "GET",
      headers,
    });

    const data = await response.json() as UsersAPI.Progress.GetMe.Response | ApiError;

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in GET /api/users/progress:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to fetch user progress" },
      { status: 500 }
    );
  }
}

