import { NextRequest, NextResponse } from "next/server";

import { updateClerkAdminUser } from "@/features/admin/api/clerk-users";
import type { AdminAPI } from "@/features/admin/types/admin.types";
import { nextResponseFromActionError } from "@/lib/http/action-route-response";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const body = (await request.json()) as AdminAPI.UpdateClerkUser.Body;
    const data = await updateClerkAdminUser(id, body);
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(
      error,
      "PUT /api/admin/users/clerk/[id]",
    );
  }
}
