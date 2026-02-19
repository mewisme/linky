import { NextRequest, NextResponse } from "next/server";

import type { ApiError } from "@/types/api.types";
import type { UsersAPI } from "@/types/users.types";
import { publicEnv } from "@/env/public-env";
import { trackEventServer } from "@/lib/analytics/events/server";

export async function PATCH(request: NextRequest) {
  trackEventServer({ name: "api_users_me_country_patch" });
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authentication token found" },
        { status: 401 }
      );
    }

    const body = await request.json() as UsersAPI.UpdateCountry.Body;
    const response = await fetch(`${publicEnv.API_URL}/api/v1/users/me/country`, {
      method: "PATCH",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json() as UsersAPI.UpdateCountry.Response | ApiError;

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in /api/users/me/country:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to update country" },
      { status: 500 }
    );
  }
}
