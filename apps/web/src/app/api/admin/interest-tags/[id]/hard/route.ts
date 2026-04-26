import { NextRequest, NextResponse } from "next/server";

import { hardDeleteInterestTag } from "@/features/admin/api/interest-tags";
import { nextResponseFromActionError } from "@/lib/http/action-route-response";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const data = await hardDeleteInterestTag(id);
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(error, "DELETE /api/admin/interest-tags/[id]/hard");
  }
}
