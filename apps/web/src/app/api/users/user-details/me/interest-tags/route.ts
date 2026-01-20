import { NextRequest, NextResponse } from "next/server";

import type { ApiError } from "@/types/api.types";
import type { UsersAPI } from "@/types/users.types";

/**
 * POST /api/users/user-details/me/interest-tags
 * Add interest tags to user details
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authentication token found" },
        { status: 401 }
      );
    }

    const body = await request.json() as UsersAPI.UserDetails.InterestTags.Add.Body;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const response = await fetch(`${apiUrl}/api/v1/user-details/me/interest-tags`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json() as UsersAPI.UserDetails.InterestTags.Add.Response | ApiError;

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in POST /api/users/user-details/me/interest-tags:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to add interest tags" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/users/user-details/me/interest-tags
 * Replace all interest tags in user details
 */
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authentication token found" },
        { status: 401 }
      );
    }

    const body = await request.json() as UsersAPI.UserDetails.InterestTags.Replace.Body;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const response = await fetch(`${apiUrl}/api/v1/user-details/me/interest-tags`, {
      method: "PUT",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json() as UsersAPI.UserDetails.InterestTags.Replace.Response | ApiError;

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in PUT /api/users/user-details/me/interest-tags:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to replace interest tags" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/user-details/me/interest-tags
 * Remove interest tags from user details
 */
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authentication token found" },
        { status: 401 }
      );
    }

    const body = await request.json() as UsersAPI.UserDetails.InterestTags.Remove.Body;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const response = await fetch(`${apiUrl}/api/v1/user-details/me/interest-tags`, {
      method: "DELETE",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json() as UsersAPI.UserDetails.InterestTags.Remove.Response | ApiError;

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in DELETE /api/users/user-details/me/interest-tags:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to remove interest tags" },
      { status: 500 }
    );
  }
}
