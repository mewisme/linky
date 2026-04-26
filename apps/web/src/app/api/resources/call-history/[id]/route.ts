import { NextRequest, NextResponse } from "next/server";

import { getCallHistoryById } from "@/actions/resources/call-history";
import { nextResponseFromActionError } from "@/lib/http/action-route-response";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    if (!id?.trim()) {
      return NextResponse.json(
        { error: "Bad Request", message: "Call history ID is required" },
        { status: 400 },
      );
    }
    const data = await getCallHistoryById(id.trim());
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(error, "GET /api/resources/call-history/[id]");
  }
}
