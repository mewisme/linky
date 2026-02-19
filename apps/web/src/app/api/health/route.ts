import { NextResponse } from "next/server";
import { publicEnv } from "@/env/public-env";
import { trackEventServer } from "@/lib/analytics/events/server";

export async function GET() {
  trackEventServer({ name: "api_health_get" });
  const response = await fetch(`${publicEnv.API_URL}/healthz`);
  const data = await response.json();
  return NextResponse.json(data);
}