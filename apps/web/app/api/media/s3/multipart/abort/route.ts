import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/utils/logger";
import type { MediaAPI } from "@/types/media.types";
import type { ApiError } from "@/types/api.types";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authentication token found" },
        { status: 401 }
      );
    }

    const body = await request.json() as MediaAPI.S3.AbortMultipart.Body;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const response = await fetch(`${apiUrl}/api/v1/s3/multipart/abort`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json() as MediaAPI.S3.AbortMultipart.Response | ApiError;

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    logger.error("Error in /api/media/s3/multipart/abort:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to abort multipart upload" },
      { status: 500 }
    );
  }
}
