import { NextResponse } from "next/server";

import { syncAllEmbeddings } from "@/features/admin/api/embeddings";
import { nextResponseFromActionError } from "@/lib/http/action-route-response";

export async function POST() {
  try {
    const data = await syncAllEmbeddings();
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(error, "POST /api/admin/embeddings/sync-all");
  }
}
