import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";

import type { ApiError } from "@/shared/types/api.types";
import type { ResourcesAPI } from "@/shared/types/resources.types";
import { publicEnv } from "@/shared/env/public-env";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ version: string }> }
) {
  const { version } = await params;
  try {

    if (!version) {
      return NextResponse.json(
        { error: "Bad Request", message: "Version is required" },
        { status: 400 }
      );
    }

    const response = await fetch(`${publicEnv.API_URL}/api/v1/changelogs/${encodeURIComponent(version)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json() as ResourcesAPI.Changelogs.GetByVersion.Response | ApiError;

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    Sentry.logger.error("Error in /api/resources/changelogs/[version]", { error });
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to fetch changelog" },
      { status: 500 }
    );
  }
}
