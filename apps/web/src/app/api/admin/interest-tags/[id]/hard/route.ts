import { publicEnv } from "@/env";
import { trackEventServer } from "@/lib/analytics/events/server";
import type { AdminAPI } from "@/types/admin.types";
import type { ApiError } from "@/types/api.types";
import { NextRequest, NextResponse } from "next/server";

/**
 * DELETE /api/admin/interest-tags/[id]/hard
 * Hard delete an interest tag (admin only, permanently removes from database)
 * WARNING: This will permanently delete the tag. Use with caution.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  trackEventServer({
    name: "api_admin_interest_tags_id_hard_delete",
    properties: { id },
  });
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authentication token found" },
        { status: 401 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { error: "Bad Request", message: "Invalid tag ID" },
        { status: 400 }
      );
    }

    const response = await fetch(`${publicEnv.API_URL}/api/v1/admin/interest-tags/${id}/hard`, {
      method: "DELETE",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json() as AdminAPI.InterestTags.HardDelete.Response | ApiError;

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in DELETE /api/admin/interest-tags/[id]/hard:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to hard delete interest tag" },
      { status: 500 }
    );
  }
}
