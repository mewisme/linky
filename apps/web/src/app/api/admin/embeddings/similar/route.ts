import { NextRequest, NextResponse } from "next/server";

import { findSimilarUsers } from "@/features/admin/api/embeddings";
import { nextResponseFromActionError } from "@/lib/http/action-route-response";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { user_id?: string; limit?: number };
    if (!body.user_id?.trim()) {
      return NextResponse.json(
        { error: "Bad Request", message: "user_id is required" },
        { status: 400 },
      );
    }
    const data = await findSimilarUsers(body.user_id.trim(), body.limit);
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(error, "POST /api/admin/embeddings/similar");
  }
}
