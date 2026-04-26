import { NextRequest, NextResponse } from "next/server";

import { getStreakCalendar } from "@/features/user/api/streak";
import { nextResponseFromActionError } from "@/lib/http/action-route-response";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const yearRaw = searchParams.get("year");
    const monthRaw = searchParams.get("month");
    if (yearRaw == null || monthRaw == null || yearRaw === "" || monthRaw === "") {
      return NextResponse.json(
        { error: "Bad Request", message: "year and month query parameters are required" },
        { status: 400 },
      );
    }
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    if (!Number.isFinite(year) || !Number.isFinite(month)) {
      return NextResponse.json(
        { error: "Bad Request", message: "year and month must be numbers" },
        { status: 400 },
      );
    }
    const data = await getStreakCalendar(year, month);
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(error, "GET /api/users/streak/calendar");
  }
}
