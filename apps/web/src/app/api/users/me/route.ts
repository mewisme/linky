import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { headers as nextHeaders } from "next/headers";

import { getMe, updateUserCountry } from "@/features/user/api/profile";
import { nextResponseFromActionError } from "@/lib/http/action-route-response";

export async function GET(request: NextRequest) {
  try {
    const userData = await getMe();

    const headersList = await nextHeaders();
    const countryHeader =
      request.headers.get("cf-ipcountry") || headersList.get("cf-ipcountry");

    if ((!userData.country || userData.country === null) && countryHeader) {
      try {
        const updated = await updateUserCountry(countryHeader);
        return NextResponse.json(updated);
      } catch (updateError) {
        Sentry.logger.error("Error updating country in GET /api/users/me", { error: updateError });
      }
    }

    return NextResponse.json(userData);
  } catch (error) {
    return nextResponseFromActionError(error, "GET /api/users/me");
  }
}
