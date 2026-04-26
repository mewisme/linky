import { NextResponse } from "next/server";

import { getBlockedUsers } from "@/features/user/api/blocks";
import { nextResponseFromActionError } from "@/lib/http/action-route-response";

export async function GET() {
  try {
    const data = await getBlockedUsers();
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(error, "GET /api/users/blocks/me");
  }
}
