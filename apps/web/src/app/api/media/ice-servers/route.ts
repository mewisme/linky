import { trackEventServer } from "@/lib/analytics/events/server";
import type { ApiError } from "@/types/api.types";
import type { MediaAPI } from "@/types/media.types";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  trackEventServer({ name: "api_media_ice_servers_get" });
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authentication token found" },
        { status: 401 }
      );
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const response = await fetch(`${apiUrl}/api/ice-servers`, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json() as MediaAPI.IceServers.Get.Response | ApiError;

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in /api/media/ice-servers:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to fetch ICE servers" },
      { status: 500 }
    );
  }
}
