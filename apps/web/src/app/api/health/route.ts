import { NextResponse } from "next/server";
import { publicEnv } from "@/env/public-env";

export async function GET() {
  const response = await fetch(`${publicEnv.API_URL}/healthz`);
  const data = await response.json();
  return NextResponse.json(data);
}