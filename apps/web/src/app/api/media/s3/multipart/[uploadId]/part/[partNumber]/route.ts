import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";

import type { ApiError } from "@/types/api.types";
import type { MediaAPI } from "@/types/media.types";
import { publicEnv } from "@/env/public-env";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uploadId: string; partNumber: string }> }
) {
  const { uploadId, partNumber } = await params;
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authentication token found" },
        { status: 401 }
      );
    }
    const { searchParams } = new URL(request.url);

    if (!uploadId || !partNumber) {
      return NextResponse.json(
        { error: "Bad Request", message: "Upload ID and part number are required" },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${publicEnv.API_URL}/api/v1/s3/multipart/${uploadId}/part/${partNumber}?${searchParams.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json() as MediaAPI.S3.GetPartUploadUrl.Response | ApiError;

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    Sentry.logger.error("Error in /api/media/s3/multipart/[uploadId]/part/[partNumber]", { error });
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to get part upload URL" },
      { status: 500 }
    );
  }
}
