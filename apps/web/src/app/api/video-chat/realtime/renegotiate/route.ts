import { NextRequest } from "next/server";

import { backendUrl } from "@/lib/http/backend-url";
import { proxyToBackend } from "@/lib/http/proxy-to-backend";

export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest) {
  return proxyToBackend({
    request,
    url: backendUrl.videoChat.realtime.renegotiate(),
    method: "PUT",
    logLabel: "PUT /api/video-chat/realtime/renegotiate",
  });
}
