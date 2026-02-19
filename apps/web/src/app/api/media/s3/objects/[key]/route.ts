import { NextRequest, NextResponse } from "next/server";

import type { ApiError } from "@/types/api.types";
import type { MediaAPI } from "@/types/media.types";
import { publicEnv } from "@/env/public-env";
import { trackEventServer } from "@/lib/analytics/events/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  trackEventServer({
    name: "api_media_s3_objects_key_delete",
    properties: { key },
  });
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authentication token found" },
        { status: 401 }
      );
    }

    if (!key) {
      return NextResponse.json(
        { error: "Bad Request", message: "Object key is required" },
        { status: 400 }
      );
    }

    const encodedKey = encodeURIComponent(key);
    const response = await fetch(`${publicEnv.API_URL}/api/v1/s3/objects/${encodedKey}`, {
      method: "DELETE",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json() as MediaAPI.S3.DeleteObject.Response | ApiError;

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in /api/media/s3/objects/[key]:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to delete object" },
      { status: 500 }
    );
  }
}
