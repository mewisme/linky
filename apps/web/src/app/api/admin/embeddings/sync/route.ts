import { NextRequest, NextResponse } from "next/server";

import { publicEnv } from "@/env/public-env";
import { trackEventServer } from "@/lib/analytics/events/server";

export async function POST(request: NextRequest) {
  trackEventServer({ name: "api_admin_embeddings_sync_post" });
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authentication token found" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const response = await fetch(`${publicEnv.API_URL}/api/v1/admin/embeddings/sync`, {
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
    console.error("Error in POST /api/admin/embeddings/sync:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to sync embeddings" },
      { status: 500 }
    );
  }
}
