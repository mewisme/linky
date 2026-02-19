import { publicEnv } from "@/env";
import { trackEventServer } from "@/lib/analytics/events/server";
import type { ApiError } from "@/types/api.types";
import type { ResourcesAPI } from "@/types/resources.types";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  trackEventServer({
    name: "api_resources_call_history_id_get",
    properties: { id },
  });
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authentication token found" },
        { status: 401 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { error: "Bad Request", message: "Call history ID is required" },
        { status: 400 }
      );
    }

    const response = await fetch(`${publicEnv.API_URL}/api/v1/call-history/${id}`, {
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
    console.error("Error in /api/resources/call-history/[id]:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to fetch call history" },
      { status: 500 }
    );
  }
}
