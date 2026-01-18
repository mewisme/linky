import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/utils/logger";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { favorite_user_id: string } }
) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authentication token found" },
        { status: 401 }
      );
    }

    const { favorite_user_id } = params;

    if (!favorite_user_id) {
      return NextResponse.json(
        { error: "Bad Request", message: "favorite_user_id is required" },
        { status: 400 }
      );
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const response = await fetch(
      `${apiUrl}/api/v1/favorites/${favorite_user_id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    logger.error("Error in DELETE /api/resources/favorites/:favorite_user_id:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to remove favorite" },
      { status: 500 }
    );
  }
}
