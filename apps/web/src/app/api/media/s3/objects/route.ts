import { NextRequest, NextResponse } from "next/server";

import type { ApiError } from "@/types/api.types";
import type { MediaAPI } from "@/types/media.types";
import { publicEnv } from "@/env/public-env";
import { trackEventServer } from "@/lib/analytics/events/server";

export async function GET(request: NextRequest) {
  trackEventServer({ name: "api_media_s3_objects_get" });
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authentication token found" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const response = await fetch(
      `${publicEnv.API_URL}/api/v1/s3/objects?${searchParams.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json() as MediaAPI.S3.ListObjects.Response | ApiError;

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in /api/media/s3/objects:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to list objects" },
      { status: 500 }
    );
  }
}
