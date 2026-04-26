import { NextResponse } from "next/server";

import { getQueueStatus } from "@/actions/matchmaking";
import { nextResponseFromActionError } from "@/lib/http/action-route-response";

export async function GET() {
  try {
    const data = await getQueueStatus();
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(error, "GET /api/matchmaking/queue-status");
  }
}
