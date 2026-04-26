import { NextRequest, NextResponse } from "next/server";

import { updateUserCountry } from "@/features/user/api/profile";
import { nextResponseFromActionError } from "@/lib/http/action-route-response";

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as { country?: string };
    if (!body.country?.trim()) {
      return NextResponse.json(
        { error: "Bad Request", message: "country is required" },
        { status: 400 },
      );
    }
    const data = await updateUserCountry(body.country.trim());
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(error, "PATCH /api/users/me/country");
  }
}
