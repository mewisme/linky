import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/utils/logger";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authentication token found" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { favorite_user_id } = body;

    if (!favorite_user_id) {
      return NextResponse.json(
        { error: "Bad Request", message: "favorite_user_id is required" },
        { status: 400 }
      );
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const response = await fetch(
      `${apiUrl}/api/v1/favorites`,
      {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ favorite_user_id }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    logger.error("Error in POST /api/resources/favorites:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to add favorite" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authentication token found" },
        { status: 401 }
      );
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const response = await fetch(
      `${apiUrl}/api/v1/favorites`,
      {
        method: "GET",
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
    logger.error("Error in GET /api/resources/favorites:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to fetch favorites" },
      { status: 500 }
    );
  }
}
