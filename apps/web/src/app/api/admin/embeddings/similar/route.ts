import { publicEnv } from "@/env";
import { trackEventServer } from "@/lib/analytics/events/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  trackEventServer({ name: "api_admin_embeddings_similar_post" });
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authentication token found" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const response = await fetch(`${publicEnv.API_URL}/api/v1/admin/embeddings/similar`, {
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

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in POST /api/admin/embeddings/similar:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to find similar users" },
      { status: 500 }
    );
  }
}
