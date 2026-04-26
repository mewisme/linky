import { NextRequest, NextResponse } from "next/server";

import { createStreakExpBonus, getAdminStreakExpBonuses } from "@/features/admin/api/streak-exp-bonuses";
import type { AdminAPI } from "@/features/admin/types/admin.types";
import { nextResponseFromActionError } from "@/lib/http/action-route-response";
import { searchParamsToActionParams } from "@/lib/http/search-params-to-action-params";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = searchParamsToActionParams(searchParams);
    const data = await getAdminStreakExpBonuses(Object.keys(params).length > 0 ? params : undefined);
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(error, "GET /api/admin/streak-exp-bonuses");
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AdminAPI.StreakExpBonuses.Create.Body;
    const data = await createStreakExpBonus(body);
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(error, "POST /api/admin/streak-exp-bonuses");
  }
}
