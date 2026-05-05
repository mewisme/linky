import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";

import { fetchWithApiFallback } from "@/lib/http/fetch-with-api-fallback";
import { publicEnv } from "@/shared/env/public-env";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authentication token found" },
        { status: 401 }
      );
    }

    const body = (await request.json()) as { intent?: string; content_type?: string };
    const response = await fetchWithApiFallback(`${publicEnv.API_URL}/api/v1/admin/media/presigned-upload`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    Sentry.logger.error("Error in POST /api/admin/media/presigned-upload", { error });
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to get presigned upload URL" },
      { status: 500 }
    );
  }
}
