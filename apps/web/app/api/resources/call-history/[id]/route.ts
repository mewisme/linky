import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/utils/logger";
import type { ResourcesAPI } from "@/types/resources.types";
import type { ApiError } from "@/types/api.types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authentication token found" },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Bad Request", message: "Call history ID is required" },
        { status: 400 }
      );
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const response = await fetch(`${apiUrl}/api/v1/call-history/${id}`, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json() as ResourcesAPI.CallHistory.GetById.Response | ApiError;

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    logger.error("Error in /api/resources/call-history/[id]:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to fetch call history" },
      { status: 500 }
    );
  }
}
