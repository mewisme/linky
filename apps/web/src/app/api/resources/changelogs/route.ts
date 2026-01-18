import { NextRequest, NextResponse } from "next/server";

import type { ApiError } from "@/types/api.types";
import type { ResourcesAPI } from "@/types/resources.types";
import { logger } from "@/utils/logger";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") || "50";
    const offset = searchParams.get("offset") || "0";
    const orderBy = searchParams.get("order_by") || "release_date";

    const queryParams = new URLSearchParams();
    queryParams.append("limit", limit);
    queryParams.append("offset", offset);
    queryParams.append("order_by", orderBy);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const response = await fetch(
      `${apiUrl}/api/v1/changelogs?${queryParams.toString()}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json() as ResourcesAPI.Changelogs.Get.Response | ApiError;

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    logger.error("Error in /api/resources/changelogs:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to fetch changelogs" },
      { status: 500 }
    );
  }
}
