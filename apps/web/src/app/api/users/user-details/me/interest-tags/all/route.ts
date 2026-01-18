import { NextRequest, NextResponse } from "next/server";

import type { ApiError } from "@/types/api.types";
import type { UsersAPI } from "@/types/users.types";
import { logger } from "@/utils/logger";

/**
 * DELETE /api/users/user-details/me/interest-tags/all
 * Clear all interest tags from user details
 */
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authentication token found" },
        { status: 401 }
      );
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const response = await fetch(`${apiUrl}/api/v1/user-details/me/interest-tags/all`, {
      method: "DELETE",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json() as UsersAPI.UserDetails.InterestTags.Clear.Response | ApiError;

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    logger.error("Error in DELETE /api/users/user-details/me/interest-tags/all:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to clear interest tags" },
      { status: 500 }
    );
  }
}
