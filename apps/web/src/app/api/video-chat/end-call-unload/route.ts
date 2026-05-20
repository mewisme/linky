import { NextRequest, NextResponse } from "next/server";

import { backendUrl } from "@/lib/http/backend-url";
import { proxyToBackend } from "@/lib/http/proxy-to-backend";

export async function POST(request: NextRequest) {
  let socketId: unknown;
  try {
    const cloned = request.clone();
    const parsed = await cloned.json();
    socketId = parsed?.socketId;
  } catch {
    socketId = undefined;
  }

  if (!socketId || typeof socketId !== "string") {
    return NextResponse.json(
      { error: "socketId is required" },
      { status: 400 },
    );
  }

  return proxyToBackend({
    request,
    url: backendUrl.videoChat.endCallUnload(),
    method: "POST",
    logLabel: "POST /api/video-chat/end-call-unload",
  });
}
