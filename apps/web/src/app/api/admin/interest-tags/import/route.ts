import { NextRequest, NextResponse } from "next/server";

import { importInterestTags } from "@/features/admin/api/interest-tags";
import type { AdminAPI } from "@/features/admin/types/admin.types";
import { nextResponseFromActionError } from "@/lib/http/action-route-response";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AdminAPI.InterestTags.Import.Body;
    const data = await importInterestTags(body);
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(error, "POST /api/admin/interest-tags/import");
  }
}
