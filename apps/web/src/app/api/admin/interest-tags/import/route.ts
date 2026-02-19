import { NextRequest, NextResponse } from "next/server";

import type { AdminAPI } from "@/types/admin.types";
import type { ApiError } from "@/types/api.types";
import { publicEnv } from "@/env/public-env";
import { trackEventServer } from "@/lib/analytics/events/server";

/**
 * POST /api/admin/interest-tags/import
 * Bulk import interest tags from JSON (admin only).
 * Request body: { items: Array<{ display_name, category?, icon?, description?, is_active? }> }
 */
export async function POST(request: NextRequest) {
  trackEventServer({ name: "api_admin_interest_tags_import_post" });
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authentication token found" },
        { status: 401 }
      );
    }

    const body = (await request.json()) as unknown;
    if (!body || typeof body !== "object" || !Array.isArray((body as AdminAPI.InterestTags.Import.Body).items)) {
      return NextResponse.json(
        { error: "Bad Request", message: "Request body must be an object with an 'items' array" },
        { status: 400 }
      );
    }

    const response = await fetch(`${publicEnv.API_URL}/api/v1/admin/interest-tags/import`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = (await response.json()) as AdminAPI.InterestTags.Import.Response | ApiError;

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in POST /api/admin/interest-tags/import:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to import interest tags" },
      { status: 500 }
    );
  }
}
