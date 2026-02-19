import { trackEventServer } from "@/lib/analytics/events/server";
import type { ApiError } from "@/types/api.types";
import type { ResourcesAPI } from "@/types/resources.types";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  trackEventServer({ name: "api_resources_reports_me_get" });
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authentication token found" },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");

    const queryParams = new URLSearchParams();
    if (limit) queryParams.set("limit", limit);
    if (offset) queryParams.set("offset", offset);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const response = await fetch(`${apiUrl}/api/v1/reports/me?${queryParams.toString()}`, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json() as ResourcesAPI.Reports.GetMe.Response | ApiError;

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in GET /api/resources/reports/me:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}
