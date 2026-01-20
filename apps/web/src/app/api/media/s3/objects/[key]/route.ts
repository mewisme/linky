import { NextRequest, NextResponse } from "next/server";

import type { ApiError } from "@/types/api.types";
import type { MediaAPI } from "@/types/media.types";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authentication token found" },
        { status: 401 }
      );
    }

    const { key } = await params;

    if (!key) {
      return NextResponse.json(
        { error: "Bad Request", message: "Object key is required" },
        { status: 400 }
      );
    }

    const encodedKey = encodeURIComponent(key);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const response = await fetch(`${apiUrl}/api/v1/s3/objects/${encodedKey}`, {
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
