import { NextResponse, type NextRequest } from "next/server";

import { E2E_REQUEST_HEADER } from "@/features/video-chat/lib/e2e/constants";
import { isValidE2eKey } from "@/features/video-chat/lib/e2e/verify-e2e-key";

export async function GET(request: NextRequest) {
  const key = request.headers.get(E2E_REQUEST_HEADER);
  return NextResponse.json({ relaxedCall: isValidE2eKey(key) });
}
