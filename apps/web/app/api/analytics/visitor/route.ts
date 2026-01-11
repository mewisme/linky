import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/analytics/visitor`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });
  return NextResponse.json(await response.json());
}

