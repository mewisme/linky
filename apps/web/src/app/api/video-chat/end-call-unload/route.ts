import { NextRequest, NextResponse } from "next/server";

import { publicEnv } from "@/env/public-env";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const socketId = body?.socketId;

    if (!socketId || typeof socketId !== "string") {
      return NextResponse.json(
        { error: "socketId is required" },
        { status: 400 }
      );
    }

    const response = await fetch(`${publicEnv.API_URL}/api/v1/video-chat/end-call-unload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ socketId }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in POST /api/video-chat/end-call-unload:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to proxy end-call-unload" },
      { status: 500 }
    );
  }
}
