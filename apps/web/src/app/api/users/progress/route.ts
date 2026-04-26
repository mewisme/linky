import { NextResponse } from "next/server";

import { getUserProgress } from "@/features/user/api/profile";
import { nextResponseFromActionError } from "@/lib/http/action-route-response";

export async function GET() {
  try {
    const data = await getUserProgress();
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(error, "GET /api/users/progress");
  }
}
