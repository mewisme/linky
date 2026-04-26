import { NextRequest, NextResponse } from "next/server";

import { softDeleteAdminUser } from "@/features/admin/api/users";
import { nextResponseFromActionError } from "@/lib/http/action-route-response";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const data = await softDeleteAdminUser(id);
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(error, "POST /api/admin/users/[id]/soft-delete");
  }
}
