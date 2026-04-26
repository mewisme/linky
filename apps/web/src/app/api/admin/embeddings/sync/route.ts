import { NextRequest, NextResponse } from "next/server";

import { syncEmbeddings } from "@/features/admin/api/embeddings";
import { nextResponseFromActionError } from "@/lib/http/action-route-response";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { user_ids?: string[] };
    if (!body.user_ids || !Array.isArray(body.user_ids)) {
      return NextResponse.json(
        { error: "Bad Request", message: "user_ids array is required" },
        { status: 400 },
      );
    }
    const data = await syncEmbeddings(body.user_ids);
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(error, "POST /api/admin/embeddings/sync");
  }
}
