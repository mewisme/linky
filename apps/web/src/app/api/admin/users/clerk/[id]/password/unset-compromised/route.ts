import { NextRequest, NextResponse } from "next/server";

import { unsetClerkAdminPasswordCompromised } from "@/features/admin/api/clerk-users";
import { nextResponseFromActionError } from "@/lib/http/action-route-response";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const data = await unsetClerkAdminPasswordCompromised(id);
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(
      error,
      "POST /api/admin/users/clerk/[id]/password/unset-compromised",
    );
  }
}
