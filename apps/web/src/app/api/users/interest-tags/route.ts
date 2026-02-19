import { publicEnv } from "@/env";
import { trackEventServer } from "@/lib/analytics/events/server";
import type { ApiError } from "@/types/api.types";
import type { UsersAPI } from "@/types/users.types";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  trackEventServer({ name: "api_users_interest_tags_post" });
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authentication token found" },
        { status: 401 }
      );
    }

    const body = await request.json() as UsersAPI.UserDetails.InterestTags.Add.Body;
    const response = await fetch(`${publicEnv.API_URL}/api/v1/user-details/me/interest-tags`, {
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
    console.error("Error in POST /api/users/interest-tags:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to add interest tags" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  trackEventServer({ name: "api_users_interest_tags_put" });
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authentication token found" },
        { status: 401 }
      );
    }

    const body = await request.json() as UsersAPI.UserDetails.InterestTags.Replace.Body;
    const response = await fetch(`${publicEnv.API_URL}/api/v1/user-details/me/interest-tags`, {
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
    console.error("Error in PUT /api/users/interest-tags:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to replace interest tags" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  trackEventServer({ name: "api_users_interest_tags_delete" });
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authentication token found" },
        { status: 401 }
      );
    }

    const body = await request.json() as UsersAPI.UserDetails.InterestTags.Remove.Body;
    const response = await fetch(`${publicEnv.API_URL}/api/v1/user-details/me/interest-tags`, {
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
    console.error("Error in DELETE /api/users/interest-tags:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to remove interest tags" },
      { status: 500 }
    );
  }
}

