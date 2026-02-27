import { NextRequest, NextResponse } from "next/server";

import { publicEnv } from "@/env/public-env";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authentication token found" },
        { status: 401 }
      );
    }

    const response = await fetch(
      `${publicEnv.API_URL}/api/v1/notifications/${id}/read`,
      {
        method: "PATCH",
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
    console.error("Error in PATCH /api/notifications/[id]/read:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to mark notification as read" },
      { status: 500 }
    );
  }
}
