import { NextRequest, NextResponse } from "next/server";

import type { ApiError } from "@/types/api.types";
import { trackEventServer } from "@/lib/analytics/events/server";

export interface StreakCalendarDay {
  date: string;
  isValid: boolean;
  totalCallSeconds: number;
  isToday: boolean;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year");
  const month = searchParams.get("month");
  trackEventServer({
    name: "api_users_streak_calendar_get",
    properties: year && month ? { year, month } : undefined,
  });
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authentication token found" },
        { status: 401 }
      );
    }

    if (!year || !month) {
      return NextResponse.json(
        { error: "Bad Request", message: "Year and month query parameters are required" },
        { status: 400 }
      );
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const timezone = request.headers.get("x-user-timezone") ?? request.nextUrl.searchParams.get("timezone");

    const headers: Record<string, string> = {
      Authorization: authHeader,
      "Content-Type": "application/json",
    };
    if (timezone) {
      headers["x-user-timezone"] = timezone;
    }

    const response = await fetch(
      `${apiUrl}/api/v1/user-streak/calendar?year=${year}&month=${month}`,
      { method: "GET", headers }
    );

    const data = await response.json() as StreakCalendarDay[] | ApiError;

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in GET /api/users/streak/calendar:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to fetch streak calendar" },
      { status: 500 }
    );
  }
}

