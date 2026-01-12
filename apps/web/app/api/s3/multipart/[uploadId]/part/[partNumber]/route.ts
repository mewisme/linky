import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/utils/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uploadId: string; partNumber: string }> }
) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authentication token found" },
        { status: 401 }
      );
    }

    const { uploadId, partNumber } = await params;
    const { searchParams } = new URL(request.url);

    if (!uploadId || !partNumber) {
      return NextResponse.json(
        { error: "Bad Request", message: "Upload ID and part number are required" },
        { status: 400 }
      );
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const response = await fetch(
      `${apiUrl}/api/v1/s3/multipart/${uploadId}/part/${partNumber}?${searchParams.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    logger.error("Error in /api/s3/multipart/[uploadId]/part/[partNumber]:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to get part upload URL" },
      { status: 500 }
    );
  }
}
