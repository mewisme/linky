import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";

import type { ApiError } from "@/shared/types/api.types";
import type { ResourcesAPI } from "@/shared/types/resources.types";
import { fetchWithApiFallback } from "@/lib/http/fetch-with-api-fallback";
import { publicEnv } from "@/shared/env/public-env";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {

    if (!id) {
      return NextResponse.json(
        { error: "Bad Request", message: "Invalid tag ID" },
        { status: 400 }
      );
    }

    const response = await fetchWithApiFallback(`${publicEnv.API_URL}/api/v1/interest-tags/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json() as ResourcesAPI.InterestTags.GetById.Response | ApiError;

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    Sentry.logger.error("Error in /api/resources/interest-tags/[id]", { error });
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to fetch interest tag" },
      { status: 500 }
    );
  }
}
