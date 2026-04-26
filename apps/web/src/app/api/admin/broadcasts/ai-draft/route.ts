import { NextRequest, NextResponse } from "next/server";

import { generateBroadcastAiDraft } from "@/features/admin/api/broadcasts";
import type { AdminAPI } from "@/features/admin/types/admin.types";
import { nextResponseFromActionError } from "@/lib/http/action-route-response";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AdminAPI.Broadcasts.AiGenerate.Body;
    const data = await generateBroadcastAiDraft(body);
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(error, "POST /api/admin/broadcasts/ai-draft");
  }
}
