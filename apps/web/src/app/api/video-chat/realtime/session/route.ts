import { NextRequest } from "next/server";

import { backendUrl } from "@/lib/http/backend-url";
import { proxyToBackend } from "@/lib/http/proxy-to-backend";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return proxyToBackend({
    request,
    url: backendUrl.videoChat.realtime.session(),
    method: "POST",
    logLabel: "POST /api/video-chat/realtime/session",
  });
}
