import { NextRequest, NextResponse } from "next/server";

import type { ApiError } from "@/types/api.types";
import type { MediaAPI } from "@/types/media.types";
import { logger } from "@/utils/logger";

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
    const response = await fetch(
      `${apiUrl}/api/v1/s3/presigned/download?${searchParams.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json() as MediaAPI.S3.GetDownloadUrl.Response | ApiError;

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    logger.error("Error in /api/media/s3/presigned/download:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to get download URL" },
      { status: 500 }
    );
  }
}
