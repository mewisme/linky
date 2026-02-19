import { publicEnv } from "@/env";
import { trackEventServer } from "@/lib/analytics/events/server";
import type { ApiError } from "@/types/api.types";
import type { UsersAPI } from "@/types/users.types";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  trackEventServer({ name: "api_users_settings_get" });
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authentication token found" },
        { status: 401 }
      );
    }

    const response = await fetch(`${publicEnv.API_URL}/api/v1/user-settings/me`, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json() as UsersAPI.UserSettings.GetMe.Response | ApiError;

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in /api/users/settings:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to fetch user settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  trackEventServer({ name: "api_users_settings_put" });
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authentication token found" },
        { status: 401 }
      );
    }

    const body = await request.json() as UsersAPI.UserSettings.UpdateMe.Body;
    const response = await fetch(`${publicEnv.API_URL}/api/v1/user-settings/me`, {
      method: "PUT",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json() as UsersAPI.UserSettings.UpdateMe.Response | ApiError;

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in PUT /api/users/settings:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to update user settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  trackEventServer({ name: "api_users_settings_patch" });
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authentication token found" },
        { status: 401 }
      );
    }

    const body = await request.json() as UsersAPI.UserSettings.PatchMe.Body;
    const response = await fetch(`${publicEnv.API_URL}/api/v1/user-settings/me`, {
      method: "PATCH",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json() as UsersAPI.UserSettings.PatchMe.Response | ApiError;

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in PATCH /api/users/settings:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to update user settings" },
      { status: 500 }
    );
  }
}

