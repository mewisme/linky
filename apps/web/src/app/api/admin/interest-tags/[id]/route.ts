import { NextRequest, NextResponse } from "next/server";

import type { AdminAPI } from "@/types/admin.types";
import type { ApiError } from "@/types/api.types";

/**
 * GET /api/admin/interest-tags/[id]
 * Get specific interest tag by ID (admin only, including inactive)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authentication token found" },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Bad Request", message: "Invalid tag ID" },
        { status: 400 }
      );
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const response = await fetch(`${apiUrl}/api/v1/admin/interest-tags/${id}`, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json() as AdminAPI.InterestTags.GetById.Response | ApiError;

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in GET /api/admin/interest-tags/[id]:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to fetch interest tag" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/interest-tags/[id]
 * Full update an interest tag (admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authentication token found" },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Bad Request", message: "Invalid tag ID" },
        { status: 400 }
      );
    }

    const body = await request.json() as AdminAPI.InterestTags.Update.Body;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const response = await fetch(`${apiUrl}/api/v1/admin/interest-tags/${id}`, {
      method: "PUT",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json() as AdminAPI.InterestTags.Update.Response | ApiError;

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in PUT /api/admin/interest-tags/[id]:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to update interest tag" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/interest-tags/[id]
 * Partial update an interest tag (admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authentication token found" },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Bad Request", message: "Invalid tag ID" },
        { status: 400 }
      );
    }

    const body = await request.json() as AdminAPI.InterestTags.Patch.Body;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const response = await fetch(`${apiUrl}/api/v1/admin/interest-tags/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json() as AdminAPI.InterestTags.Patch.Response | ApiError;

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in PATCH /api/admin/interest-tags/[id]:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to update interest tag" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/interest-tags/[id]
 * Soft delete an interest tag (admin only, sets is_active to false)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authentication token found" },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Bad Request", message: "Invalid tag ID" },
        { status: 400 }
      );
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const response = await fetch(`${apiUrl}/api/v1/admin/interest-tags/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json() as AdminAPI.InterestTags.Delete.Response | ApiError;

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in DELETE /api/admin/interest-tags/[id]:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to delete interest tag" },
      { status: 500 }
    );
  }
}
