import { trackEventServer } from "@/lib/analytics/events/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  trackEventServer({ name: "api_users_blocks_me_get" });
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authentication token found" },
        { status: 401 }
      );
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const response = await fetch(`${apiUrl}/api/v1/users/blocks/me`, {
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
    console.error("Error in GET /api/users/blocks/me:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to fetch blocked users" },
      { status: 500 }
    );
  }
}
