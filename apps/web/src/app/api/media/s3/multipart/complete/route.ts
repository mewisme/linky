import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";

import type { ApiError } from "@/shared/types/api.types";
import type { MediaAPI } from "@/shared/types/media.types";
import {
  bffInternalErrorResponse,
  bffMissingAuthResponse,
} from "@/lib/http/bff-response";
import { fetchWithApiFallback } from "@/lib/http/fetch-with-api-fallback";
import { publicEnv } from "@/shared/env/public-env";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return bffMissingAuthResponse();
    }

    const body = (await request.json()) as MediaAPI.S3.CompleteMultipart.Body;
    const response = await fetchWithApiFallback(
      `${publicEnv.API_URL}/api/v1/admin/s3/multipart/complete`,
      {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    const data = (await response.json()) as
      | MediaAPI.S3.CompleteMultipart.Response
      | ApiError;

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    Sentry.logger.error("Error in /api/media/s3/multipart/complete", { error });
    return bffInternalErrorResponse(
      "failedCompleteMultipart",
      "Failed to complete multipart upload",
    );
  }
}
