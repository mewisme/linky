import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { path } = await request.json();
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/analytics/visit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ path }),
  });
  return NextResponse.json(await response.json());
}