import { publicEnv } from "@/env";
import { trackEventServer } from "@/lib/analytics/events/server";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ blocked_user_id: string }> }
) {
  const { blocked_user_id } = await params;
  trackEventServer({
    name: "api_users_blocks_blocked_user_id_delete",
    properties: { blocked_user_id },
  });
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authentication token found" },
        { status: 401 }
      );
    }

    const response = await fetch(
      `${publicEnv.API_URL}/api/v1/users/blocks/${blocked_user_id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in DELETE /api/users/blocks/[id]:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to unblock user" },
      { status: 500 }
    );
  }
}
