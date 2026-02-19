import { publicEnv } from "@/env";
import { trackEventServer } from "@/lib/analytics/events/server";
import type { AdminAPI } from "@/types/admin.types";
import type { ApiError } from "@/types/api.types";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  trackEventServer({ name: "api_admin_level_feature_unlocks_get" });
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authentication token found" },
        { status: 401 }
      );
    }


    const response = await fetch(
      `${publicEnv.API_URL}/api/v1/admin/level-feature-unlocks`,
      {
        method: "GET",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json() as AdminAPI.LevelFeatureUnlocks.Get.Response | ApiError;

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in GET /api/admin/level-feature-unlocks:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to fetch level feature unlocks" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  trackEventServer({ name: "api_admin_level_feature_unlocks_post" });
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authentication token found" },
        { status: 401 }
      );
    }

    const body = await request.json() as AdminAPI.LevelFeatureUnlocks.Create.Body;
    const response = await fetch(`${publicEnv.API_URL}/api/v1/admin/level-feature-unlocks`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json() as AdminAPI.LevelFeatureUnlocks.Create.Response | ApiError;

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/admin/level-feature-unlocks:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to create level feature unlock" },
      { status: 500 }
    );
  }
}
