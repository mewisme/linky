import { NextResponse } from "next/server";

import { publicEnv } from "@/env/public-env";
import { trackEventServer } from "@/lib/analytics/events/server";

interface QueueStatusResponse {
  queueSize: number;
  estimatedWaitSeconds: number | null;
}

export async function GET() {
  trackEventServer({ name: "api_matchmaking_queue_status_get" });
  try {
    const response = await fetch(
      `${publicEnv.API_URL}/api/v1/matchmaking/queue-status`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );

    const data = await response.json() as QueueStatusResponse;

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in GET /api/matchmaking/queue-status:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to fetch queue status" },
      { status: 500 }
    );
  }
}
