import { publicEnv } from "@/env";
import { trackEventServer } from "@/lib/analytics/events/server";
import type { AdminAPI } from "@/types/admin.types";
import type { ApiError } from "@/types/api.types";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  trackEventServer({ name: "api_admin_changelogs_get" });
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authentication token found" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const response = await fetch(
      `${publicEnv.API_URL}/api/v1/admin/changelogs?${searchParams.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json() as AdminAPI.Changelogs.Get.Response | ApiError;

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in /api/admin/changelogs:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to fetch changelogs" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  trackEventServer({ name: "api_admin_changelogs_post" });
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authentication token found" },
        { status: 401 }
      );
    }

    const body = await request.json() as AdminAPI.Changelogs.Create.Body;
    const response = await fetch(`${publicEnv.API_URL}/api/v1/admin/changelogs`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json() as AdminAPI.Changelogs.Create.Response | ApiError;

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error in /api/admin/changelogs:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to create changelog" },
      { status: 500 }
    );
  }
}
