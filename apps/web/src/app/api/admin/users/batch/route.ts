import { NextRequest, NextResponse } from "next/server";

import { hardDeleteAdminUsers } from "@/features/admin/api/users";
import { nextResponseFromActionError } from "@/lib/http/action-route-response";

export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json()) as { ids?: string[] };
    if (!body.ids || !Array.isArray(body.ids)) {
      return NextResponse.json(
        { error: "Bad Request", message: "ids array is required" },
        { status: 400 },
      );
    }
    const data = await hardDeleteAdminUsers(body.ids);
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(error, "DELETE /api/admin/users/batch");
  }
}
