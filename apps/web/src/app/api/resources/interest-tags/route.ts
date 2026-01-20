import { NextRequest, NextResponse } from "next/server";

import type { ApiError } from "@/types/api.types";
import type { ResourcesAPI } from "@/types/resources.types";

/**
 * GET /api/resources/interest-tags
 * List all active interest tags (public endpoint, no authentication required)
 * Query params: category, search, limit, offset
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const limit = searchParams.get("limit") || "100";
    const offset = searchParams.get("offset") || "0";

    // Build query string
    const queryParams = new URLSearchParams();
    if (category) queryParams.append("category", category);
    if (search) queryParams.append("search", search);
    queryParams.append("limit", limit);
    queryParams.append("offset", offset);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const response = await fetch(
      `${apiUrl}/api/v1/interest-tags?${queryParams.toString()}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json() as ResourcesAPI.InterestTags.Get.Response | ApiError;

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in /api/resources/interest-tags:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to fetch interest tags" },
      { status: 500 }
    );
  }
}
