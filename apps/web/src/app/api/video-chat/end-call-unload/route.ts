import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { backendUrl } from "@/lib/http/backend-url";

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

    let authToken: string | null = null;
    const authHeader = request.headers.get("authorization");
    if (authHeader) {
      authToken = authHeader.replace("Bearer ", "");
    } else {
      try {
        const { getToken } = await auth({ acceptsToken: "any" });
        authToken = await getToken();
      } catch {
        Sentry.logger.warn("Failed to retrieve Clerk token for unload proxy");
      }
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    const response = await fetch(backendUrl.videoChat.endCallUnload(), {
      method: "POST",
      headers,
      body: JSON.stringify({ socketId }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    Sentry.logger.error("Error in POST /api/video-chat/end-call-unload", { error });
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to proxy end-call-unload" },
      { status: 500 }
    );
  }
}
