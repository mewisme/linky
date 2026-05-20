import { NextRequest, NextResponse } from "next/server";

import { getAdminAIConfig, saveAdminAIConfig } from "@/features/admin/api/ai-config";
import { nextResponseFromActionError } from "@/lib/http/action-route-response";
import type { AdminAPI } from "@/features/admin/types/admin.types";

export async function GET() {
  try {
    const data = await getAdminAIConfig();
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(error, "GET /api/admin/ai/config");
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as AdminAPI.AI.Config.PutBody;
    const data = await saveAdminAIConfig(body.value);
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(error, "PUT /api/admin/ai/config");
  }
}
