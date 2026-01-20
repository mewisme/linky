import { NextRequest, NextResponse } from "next/server";

import type { ApiError } from "@/types/api.types";
import type { ResourcesAPI } from "@/types/resources.types";

/**
 * GET /api/resources/interest-tags/[id]
 * Get specific interest tag by ID (public endpoint, no authentication required)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Bad Request", message: "Invalid tag ID" },
        { status: 400 }
      );
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const response = await fetch(`${apiUrl}/api/v1/interest-tags/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json() as ResourcesAPI.InterestTags.GetById.Response | ApiError;

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in /api/resources/interest-tags/[id]:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to fetch interest tag" },
      { status: 500 }
    );
  }
}
