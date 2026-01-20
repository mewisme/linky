import { NextRequest, NextResponse } from "next/server";

import type { ApiError } from "@/types/api.types";
import type { ResourcesAPI } from "@/types/resources.types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ version: string }> }
) {
  try {
    const { version } = await params;

    if (!version) {
      return NextResponse.json(
        { error: "Bad Request", message: "Version is required" },
        { status: 400 }
      );
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const response = await fetch(`${apiUrl}/api/v1/changelogs/${encodeURIComponent(version)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json() as ResourcesAPI.Changelogs.GetByVersion.Response | ApiError;

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in /api/resources/changelogs/[version]:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to fetch changelog" },
      { status: 500 }
    );
  }
}
