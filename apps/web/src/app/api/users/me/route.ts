import { NextRequest, NextResponse } from "next/server";

import type { ApiError } from "@/types/api.types";
import type { UsersAPI } from "@/types/users.types";
import { headers as nextHeaders } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authentication token found" },
        { status: 401 }
      );
    }

    const headersList = await nextHeaders();
    const countryHeader =
      request.headers.get("cf-ipcountry") ||
      headersList.get("cf-ipcountry");

    const backendHeaders: Record<string, string> = {
      Authorization: authHeader,
      "Content-Type": "application/json",
    };

    if (countryHeader) {
      backendHeaders["cf-ipcountry"] = countryHeader;
      backendHeaders["x-cf-ipcountry"] = countryHeader;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const response = await fetch(`${apiUrl}/api/v1/users/me`, {
      method: "GET",
      headers: backendHeaders,
    });

    const data = await response.json() as UsersAPI.GetMe.Response | ApiError;

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    const userData = data as UsersAPI.GetMe.Response;

    if ((!userData.country || userData.country === null) && countryHeader) {
      try {
        const updateBody: UsersAPI.UpdateCountry.Body = {
          country: countryHeader,
          clerk_user_id: userData.clerk_user_id,
        };

        const updateResponse = await fetch(`${apiUrl}/api/v1/users/me/country`, {
          method: "PATCH",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updateBody),
        });

        if (updateResponse.ok) {
          const updatedData = await updateResponse.json() as UsersAPI.UpdateCountry.Response;
          return NextResponse.json(updatedData);
        } else {
          console.error("Failed to update country:", await updateResponse.json());
        }
      } catch (updateError) {
        console.error("Error updating country:", updateError);
      }
    }

    return NextResponse.json(userData);
  } catch (error) {
    console.error("Error in /api/users/me:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to fetch user data" },
      { status: 500 }
    );
  }
}
