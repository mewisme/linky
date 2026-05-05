import { NextResponse } from "next/server";
import { publicEnv } from "@/shared/env/public-env";
import { fetchWithApiFallback } from "@/lib/http/fetch-with-api-fallback";

export async function GET() {
  const response = await fetchWithApiFallback(`${publicEnv.API_URL}/healthz`);
  const data = await response.json();
  return NextResponse.json(data);
}