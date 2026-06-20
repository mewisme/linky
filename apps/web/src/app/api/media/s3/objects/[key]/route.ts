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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return bffMissingAuthResponse();
    }

    if (!key) {
      return NextResponse.json(
        { error: "Bad Request", message: "Object key is required" },
        { status: 400 },
      );
    }

    const encodedKey = encodeURIComponent(key);
    const response = await fetchWithApiFallback(
      `${publicEnv.API_URL}/api/v1/admin/s3/objects/${encodedKey}`,
      {
        method: "DELETE",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
      },
    );

    const data = (await response.json()) as
      | MediaAPI.S3.DeleteObject.Response
      | ApiError;

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    Sentry.logger.error("Error in /api/media/s3/objects/[key]", { error });
    return bffInternalErrorResponse(
      "failedDeleteObject",
      "Failed to delete object",
    );
  }
}
