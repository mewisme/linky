import { NextRequest, NextResponse } from "next/server";

import { unsetAdminConfig } from "@/features/admin/api/admin-config";
import { nextResponseFromActionError } from "@/lib/http/action-route-response";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  try {
    await unsetAdminConfig(decodeURIComponent(key));
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return nextResponseFromActionError(error, "DELETE /api/admin/config/[key]");
  }
}
