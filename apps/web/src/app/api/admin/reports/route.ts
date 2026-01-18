import { NextRequest, NextResponse } from "next/server";

import type { AdminAPI } from "@/types/admin.types";
import type { ApiError } from "@/types/api.types";
import { logger } from "@/utils/logger";

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
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");
    const status = searchParams.get("status");
    const reporterUserId = searchParams.get("reporter_user_id");
    const reportedUserId = searchParams.get("reported_user_id");

    const queryParams = new URLSearchParams();
    if (limit) queryParams.set("limit", limit);
    if (offset) queryParams.set("offset", offset);
    if (status) queryParams.set("status", status);
    if (reporterUserId) queryParams.set("reporter_user_id", reporterUserId);
    if (reportedUserId) queryParams.set("reported_user_id", reportedUserId);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const response = await fetch(`${apiUrl}/api/v1/admin/reports?${queryParams.toString()}`, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json() as AdminAPI.Reports.Get.Response | ApiError;

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    logger.error("Error in GET /api/admin/reports:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}
