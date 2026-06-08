import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";

import type { ApiError } from "@/shared/types/api.types";
import type { MediaAPI } from "@/shared/types/media.types";
import { bffInternalErrorResponse, bffMissingAuthResponse } from "@/lib/http/bff-response";
import { fetchWithApiFallback } from "@/lib/http/fetch-with-api-fallback";
import { publicEnv } from "@/shared/env/public-env";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return bffMissingAuthResponse();
    }

    const { searchParams } = new URL(request.url);
    const response = await fetchWithApiFallback(
      `${publicEnv.API_URL}/api/v1/admin/s3/objects?${searchParams.toString()}`,
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
    Sentry.logger.error("Error in /api/media/s3/objects", { error });
    return bffInternalErrorResponse("failedListObjects", "Failed to list objects");
  }
}
