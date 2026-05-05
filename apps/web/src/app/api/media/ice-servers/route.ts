import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";

import { fetchWithApiFallback } from "@/lib/http/fetch-with-api-fallback";
import { publicEnv } from "@/shared/env/public-env";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authentication token found" },
        { status: 401 }
      );
    }

    const response = await fetchWithApiFallback(`${publicEnv.API_URL}/api/ice-servers`, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    Sentry.logger.error("Error in /api/media/ice-servers", { error });
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to fetch ICE servers" },
      { status: 500 }
    );
  }
}
