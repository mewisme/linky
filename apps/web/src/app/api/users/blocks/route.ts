import { publicEnv } from "@/env";
import { trackEventServer } from "@/lib/analytics/events/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  trackEventServer({ name: "api_users_blocks_post" });
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authentication token found" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const response = await fetch(`${publicEnv.API_URL}/api/v1/users/blocks`, {
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
    console.error("Error in POST /api/users/blocks:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to block user" },
      { status: 500 }
    );
  }
}
