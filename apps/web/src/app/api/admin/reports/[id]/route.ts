import { NextRequest, NextResponse } from "next/server";

import type { AdminAPI } from "@/types/admin.types";
import type { ApiError } from "@/types/api.types";
import { publicEnv } from "@/env/public-env";
import { trackEventServer } from "@/lib/analytics/events/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  trackEventServer({
    name: "api_admin_reports_id_get",
    properties: { id },
  });
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authentication token found" },
        { status: 401 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { error: "Bad Request", message: "Report ID is required" },
        { status: 400 }
      );
    }

    const response = await fetch(`${publicEnv.API_URL}/api/v1/admin/reports/${id}`, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json() as AdminAPI.Reports.GetById.Response | ApiError;

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in GET /api/admin/reports/[id]:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to fetch report" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  trackEventServer({
    name: "api_admin_reports_id_patch",
    properties: { id },
  });
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authentication token found" },
        { status: 401 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { error: "Bad Request", message: "Report ID is required" },
        { status: 400 }
      );
    }
    const body = await request.json() as AdminAPI.Reports.Update.Body;
    const response = await fetch(`${publicEnv.API_URL}/api/v1/admin/reports/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json() as AdminAPI.Reports.Update.Response | ApiError;

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in PATCH /api/admin/reports/[id]:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to update report" },
      { status: 500 }
    );
  }
}
