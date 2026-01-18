import { NextRequest, NextResponse } from "next/server";

import type { AdminAPI } from "@/types/admin.types";
import type { ApiError } from "@/types/api.types";
import { logger } from "@/utils/logger";

/**
 * GET /api/admin/interest-tags
 * Get all interest tags (admin only, including inactive)
 * 
 * Query params:
 * - category?: string - Filter by category
 * - search?: string - Search by name or description
 * - isActive?: "true" | "false" | "all" | "1" | "0" - Filter by active status
 *   - "true" or "1": only active tags (default when filter is used)
 *   - "false" or "0": only inactive tags
 *   - "all": all tags (active and inactive)
 *   - undefined: get all tags (no filter applied)
 * - limit?: number - Number of results per page (default: 100, max: 200)
 * - offset?: number - Pagination offset (default: 0)
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authentication token found" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    // Forward all query params to backend
    // Backend will handle isActive filter logic:
    // - If isActive is provided, filter accordingly
    // - If isActive is not provided, return all tags
    const response = await fetch(
      `${apiUrl}/api/v1/admin/interest-tags?${searchParams.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json() as AdminAPI.InterestTags.Get.Response | ApiError;

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    logger.error("Error in GET /api/admin/interest-tags:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to fetch interest tags" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/interest-tags
 * Create a new interest tag (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authentication token found" },
        { status: 401 }
      );
    }

    const body = await request.json() as AdminAPI.InterestTags.Create.Body;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const response = await fetch(`${apiUrl}/api/v1/admin/interest-tags`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json() as AdminAPI.InterestTags.Create.Response | ApiError;

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    logger.error("Error in POST /api/admin/interest-tags:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to create interest tag" },
      { status: 500 }
    );
  }
}
