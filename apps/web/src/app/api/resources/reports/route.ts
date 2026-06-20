import { NextRequest, NextResponse } from "next/server";

import { createReport } from "@/actions/resources/reports";
import type { ResourcesAPI } from "@/shared/types/resources.types";
import { nextResponseFromActionError } from "@/lib/http/action-route-response";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ResourcesAPI.Reports.Create.Body;
    if (!body.reported_user_id?.trim() || !body.reason?.trim()) {
      return NextResponse.json(
        {
          error: "Bad Request",
          message: "reported_user_id and reason are required",
        },
        { status: 400 },
      );
    }
    const metadata: Record<string, unknown> = {};
    if (body.call_id) metadata.call_id = body.call_id;
    if (body.room_id) metadata.room_id = body.room_id;
    if (body.behavior_flags) metadata.behavior_flags = body.behavior_flags;

    const data = await createReport({
      reported_user_id: body.reported_user_id.trim(),
      reason: body.reason.trim(),
      ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
    });
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(error, "POST /api/resources/reports");
  }
}
