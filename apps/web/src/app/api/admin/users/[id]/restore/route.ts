import { NextRequest, NextResponse } from "next/server";

import { restoreAdminUser } from "@/features/admin/api/users";
import { nextResponseFromActionError } from "@/lib/http/action-route-response";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const data = await restoreAdminUser(id);
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(error, "POST /api/admin/users/[id]/restore");
  }
}
