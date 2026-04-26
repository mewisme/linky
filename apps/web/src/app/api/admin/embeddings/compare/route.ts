import { NextRequest, NextResponse } from "next/server";

import { compareEmbeddings } from "@/features/admin/api/embeddings";
import { nextResponseFromActionError } from "@/lib/http/action-route-response";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { user_id_a?: string; user_id_b?: string };
    if (!body.user_id_a?.trim() || !body.user_id_b?.trim()) {
      return NextResponse.json(
        { error: "Bad Request", message: "user_id_a and user_id_b are required" },
        { status: 400 },
      );
    }
    const data = await compareEmbeddings(body.user_id_a.trim(), body.user_id_b.trim());
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(error, "POST /api/admin/embeddings/compare");
  }
}
