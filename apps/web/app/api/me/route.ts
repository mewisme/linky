import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/utils/logger";
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
    const response = await fetch(`${apiUrl}/api/v1/me`, {
      method: "GET",
      headers: backendHeaders,
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    if ((!data.country || data.country === null) && countryHeader) {
      try {
        const updateResponse = await fetch(`${apiUrl}/api/v1/me/country`, {
          method: "PATCH",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ country: countryHeader, clerk_user_id: data.clerk_user_id }),
        });

        if (updateResponse.ok) {
          const updatedData = await updateResponse.json();
          return NextResponse.json(updatedData);
        } else {
          logger.error("Failed to update country:", await updateResponse.json());
        }
      } catch (updateError) {
        logger.error("Error updating country:", updateError);
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    logger.error("Error in /api/me:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to fetch user data" },
      { status: 500 }
    );
  }
}
