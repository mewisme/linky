import { NextRequest, NextResponse } from "next/server";

import { publicEnv } from "@/env/public-env";
import { trackEventServer } from "@/lib/analytics/events/server";

export async function GET(request: NextRequest) {
  trackEventServer({ name: "api_admin_broadcasts_get" });
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
      `${publicEnv.API_URL}/api/v1/admin/broadcasts?${searchParams.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in GET /api/admin/broadcasts:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to list broadcasts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  trackEventServer({ name: "api_admin_broadcasts_post" });
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authentication token found" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const response = await fetch(`${publicEnv.API_URL}/api/v1/admin/broadcasts`, {
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

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/admin/broadcasts:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to send broadcast" },
      { status: 500 }
    );
  }
}
