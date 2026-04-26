import { NextRequest, NextResponse } from "next/server";

import { softDeleteAdminUsers } from "@/features/admin/api/users";
import { nextResponseFromActionError } from "@/lib/http/action-route-response";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { ids?: string[] };
    if (!body.ids || !Array.isArray(body.ids)) {
      return NextResponse.json(
        { error: "Bad Request", message: "ids array is required" },
        { status: 400 },
      );
    }
    const data = await softDeleteAdminUsers(body.ids);
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(error, "POST /api/admin/users/batch/soft-delete");
  }
}
