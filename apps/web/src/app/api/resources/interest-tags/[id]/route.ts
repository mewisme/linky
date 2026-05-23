import { NextRequest, NextResponse } from "next/server";

import { nextResponseFromActionError } from "@/lib/http/action-route-response";
import { serverFetch } from "@/lib/http/server-api";
import { backendUrl } from "@/lib/http/backend-url";
import type { ResourcesAPI } from "@/shared/types/resources.types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    if (!id) {
      return NextResponse.json(
        { error: "Bad Request", message: "Invalid tag ID" },
        { status: 400 }
      );
    }

    const data = await serverFetch<ResourcesAPI.InterestTags.GetById.Response>(
      backendUrl.resources.interestTagById(id)
    );
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(error, "GET /api/resources/interest-tags/[id]");
  }
}
